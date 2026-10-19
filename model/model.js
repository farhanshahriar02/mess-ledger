class MessModel {
  constructor({ storageKey = 'messLedger.v3', currency = '৳' } = {}) {
    this.storageKey = storageKey;
    this.currency   = currency;
    this.members    = [];
    this.load();
  }

  _uid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.members)) return;
      this.members = data.members.map((m) => ({
        id:      m.id || this._uid(),
        name:    String(m.name || 'Unnamed'),
        meals:   Math.max(0, Number(m.meals)   || 0),
        bazar:   Math.max(0, Number(m.bazar)   || 0),
        utility: Math.max(0, Number(m.utility) || 0),
      }));
    } catch (err) {
      console.warn('[MessModel] Load failed.', err);
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({ members: this.members }));
    } catch (err) {
      console.warn('[MessModel] Save failed.', err);
    }
  }

  addMember({ name = 'New Roommate', meals = 0, bazar = 0, utility = 0 } = {}) {
    const member = {
      id:      this._uid(),
      name:    String(name).trim() || 'New Roommate',
      meals:   Math.max(0, Number(meals)   || 0),
      bazar:   Math.max(0, Number(bazar)   || 0),
      utility: Math.max(0, Number(utility) || 0),
    };
    this.members.push(member);
    this.save();
    return member;
  }

  removeMember(id) {
    const before = this.members.length;
    this.members = this.members.filter((m) => m.id !== id);
    const removed = this.members.length !== before;
    if (removed) this.save();
    return removed;
  }

  updateMember(id, field, value) {
    const member = this.members.find((m) => m.id === id);
    if (!member) return null;
    if (field === 'name')    member.name    = String(value);
    if (field === 'meals')   member.meals   = Math.max(0, Number(value) || 0);
    if (field === 'bazar')   member.bazar   = Math.max(0, Number(value) || 0);
    if (field === 'utility') member.utility = Math.max(0, Number(value) || 0);
    this.save();
    return member;
  }

  /* ============================================================
   *  RESET — zero out values but KEEP every member on the roster
   * ============================================================ */
  reset() {
    this.members = this.members.map((m) => ({
      ...m,
      meals:   0,
      bazar:   0,
      utility: 0,
    }));
    this.save();
  }

  getTotalBazar()   { return round2(this.members.reduce((s, m) => s + (Number(m.bazar)   || 0), 0)); }
  getTotalMeals()   { return round2(this.members.reduce((s, m) => s + (Number(m.meals)   || 0), 0)); }
  getTotalUtility() { return round2(this.members.reduce((s, m) => s + (Number(m.utility) || 0), 0)); }

  calculateMealRate() {
    const totalMeals = this.getTotalMeals();
    return totalMeals <= 0 ? 0 : this.getTotalBazar() / totalMeals;
  }

  calculateUtilityPerPerson() {
    return this.members.length === 0 ? 0 : this.getTotalUtility() / this.members.length;
  }

  calculateBalance(member) {
    const mealRate         = this.calculateMealRate();
    const utilityPerPerson = this.calculateUtilityPerPerson();
    const mealCost         = round2(mealRate * (Number(member.meals) || 0));
    const utilityShare     = round2(utilityPerPerson);
    const totalCost        = round2(mealCost + utilityShare);
    const totalPaid        = round2((Number(member.bazar) || 0) + (Number(member.utility) || 0));
    const balance          = round2(totalPaid - totalCost);

    const status =
      Math.abs(balance) < 0.005 ? 'settled'
      : balance > 0             ? 'refund'
      :                           'due';

    return {
      mealRate, utilityPerPerson, mealCost, utilityShare,
      totalCost, totalPaid, balance, amount: Math.abs(balance), status,
    };
  }

  getSummary() {
    const totalBazar       = this.getTotalBazar();
    const totalMeals       = this.getTotalMeals();
    const totalUtility     = this.getTotalUtility();
    const mealRate         = this.calculateMealRate();
    const utilityPerPerson = this.calculateUtilityPerPerson();

    const members = this.members.map((m) => {
      const b = this.calculateBalance(m);
      return {
        ...m,
        mealCost: b.mealCost, utilityShare: b.utilityShare,
        totalCost: b.totalCost, totalPaid: b.totalPaid,
        balance: b.balance, amount: b.amount, status: b.status,
      };
    });

    const totalRefund = round2(
      members.filter((m) => m.status === 'refund').reduce((s, m) => s + m.balance, 0)
    );
    const totalDue = round2(
      members.filter((m) => m.status === 'due').reduce((s, m) => s + Math.abs(m.balance), 0)
    );

    return {
      currency: this.currency,
      totalBazar, totalMeals, totalUtility, mealRate, utilityPerPerson,
      members, totalRefund, totalDue,
      isBalanced: Math.abs(totalRefund - totalDue) < 0.01,
      memberCount: members.length,
    };
  }
}

/* Shared numeric helper */
function round2(v) {
  return Math.round((Number(v) + Number.EPSILON) * 100) / 100;
}