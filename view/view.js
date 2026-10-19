class MessView {
  constructor() {
    this.el = {};
    this.currency = '৳';
    this._toastTimer = null;
    this._cache();
  }

  _cache() {
    this.el = {
      totalBazar:       document.getElementById('total-bazar'),
      totalMeals:       document.getElementById('total-meals'),
      totalUtility:     document.getElementById('total-utility'),
      utilityPerPerson: document.getElementById('utility-per-person'),
      mealRate:         document.getElementById('meal-rate'),
      memberCount:      document.getElementById('member-count'),
      memberList:       document.getElementById('member-list'),
      emptyState:       document.getElementById('empty-state'),
      totalRefund:      document.getElementById('total-refund'),
      totalDue:         document.getElementById('total-due'),
      ledgerStatus:     document.getElementById('ledger-status'),
      toast:            document.getElementById('toast'),
      addBtn:           document.getElementById('add-member-btn'),
      resetBtn:         document.getElementById('reset-btn'),
      copyBtn:          document.getElementById('copy-btn'),
      pdfBtn:           document.getElementById('pdf-btn'),
    };
  }

  bindAddMember(cb) { this.el.addBtn.addEventListener('click', cb); }
  bindReset(cb)     { this.el.resetBtn.addEventListener('click', cb); }
  bindCopy(cb)      { this.el.copyBtn.addEventListener('click', cb); }
  bindPDF(cb)       { this.el.pdfBtn.addEventListener('click', cb); }

  bindMemberInput(cb) {
    this.el.memberList.addEventListener('input', (e) => {
      const input = e.target.closest('[data-field]');
      const card  = input && input.closest('[data-id]');
      if (!input || !card) return;
      cb(card.dataset.id, input.dataset.field, input.value);
    });
  }

  bindRemoveMember(cb) {
    this.el.memberList.addEventListener('click', (e) => {
      const btn  = e.target.closest('[data-action="remove"]');
      const card = btn && btn.closest('[data-id]');
      if (!btn || !card) return;
      cb(card.dataset.id);
    });
  }

  renderAll(summary) {
    this.currency = summary.currency || '৳';
    this._updateSummary(summary);
    this._renderMembers(summary);
    this._updateLedger(summary);
  }

  updateLive(summary) {
    this._updateSummary(summary);
    summary.members.forEach((member) => {
      const card = this.el.memberList.querySelector(`[data-id="${member.id}"]`);
      if (!card) return;

      const avatar = card.querySelector('[data-avatar]');
      if (avatar) avatar.textContent = this._initials(member.name);

      const setText = (sel, val) => {
        const el = card.querySelector(sel);
        if (el) el.textContent = val;
      };
      setText('[data-meal-cost]',     this._money(member.mealCost, 2));
      setText('[data-utility-share]', this._money(member.utilityShare, 2));
      setText('[data-total-cost]',    this._money(member.totalCost, 2));

      const balance = card.querySelector('[data-balance]');
      if (balance) {
        balance.textContent = `${this._sign(member.status)}${this._money(member.amount, 2)}`;
        balance.className   = `breakdown-value ${this._balanceClass(member.status)}`;
      }

      const badge = card.querySelector('[data-badge]');
      if (badge) {
        const info = this._badge(member);
        badge.className   = `badge ${info.cls}`;
        badge.textContent = info.label;
      }
    });
    this._updateLedger(summary);
  }

  focusMember(id) {
    const card = this.el.memberList.querySelector(`[data-id="${id}"]`);
    if (!card) return;
    const input = card.querySelector('[data-field="name"]');
    if (input) { input.focus(); input.select(); }
  }

  showToast(message) {
    const toast = this.el.toast;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  _updateSummary(s) {
    this.el.totalBazar.textContent       = this._money(s.totalBazar, 0);
    this.el.totalMeals.textContent       = s.totalMeals.toLocaleString('en-US', {
      maximumFractionDigits: 2,
    });
    this.el.totalUtility.textContent     = this._money(s.totalUtility, 0);
    this.el.utilityPerPerson.textContent = this._money(s.utilityPerPerson, 2);
    this.el.mealRate.textContent         = this._money(s.mealRate, 2);
    this.el.memberCount.textContent      =
      `${s.memberCount} ${s.memberCount === 1 ? 'member' : 'members'}`;
  }

  _renderMembers(s) {
    if (s.members.length === 0) {
      this.el.memberList.innerHTML = '';
      this.el.emptyState.classList.remove('hidden');
      return;
    }
    this.el.emptyState.classList.add('hidden');
    this.el.memberList.innerHTML = s.members.map((m) => this._card(m)).join('');
  }

  _updateLedger(s) {
    this.el.totalRefund.textContent = this._money(s.totalRefund, 2);
    this.el.totalDue.textContent    = this._money(s.totalDue, 2);

    const hasMembers = s.memberCount > 0;
    const balanced   = hasMembers && s.isBalanced;
    const status = this.el.ledgerStatus;
    status.textContent = !hasMembers ? 'No members'
      : balanced ? 'Balanced' : 'Unbalanced';
    status.className = 'pill ' + (
      !hasMembers ? 'pill-neutral'
      : balanced  ? 'pill-success'
      :             'pill-danger'
    );
  }

  _card(m) {
    const badge      = this._badge(m);
    const initials   = this._initials(m.name);
    const avatarCls  = this._avatarColor(m.id);
    const balanceCls = this._balanceClass(m.status);

    return `
      <div class="member-card" data-id="${this._attr(m.id)}">
        <div class="member-header">
          <div class="member-avatar ${avatarCls}" data-avatar>${initials}</div>
          <div class="member-info">
            <input data-field="name" type="text" class="member-name-input"
                   value="${this._attr(m.name)}" />
            <p class="member-role">Roommate</p>
          </div>
          <span data-badge class="badge ${badge.cls}">${badge.label}</span>
          <button data-action="remove" type="button" class="member-remove"
                  aria-label="Remove ${this._attr(m.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                 stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="member-inputs">
          <label class="input-group">
            <span class="input-label">Meals</span>
            <input data-field="meals" type="number" inputmode="decimal" min="0" step="any"
                   class="input" value="${m.meals}" />
          </label>
          <label class="input-group">
            <span class="input-label">Bazar (${this.currency})</span>
            <input data-field="bazar" type="number" inputmode="decimal" min="0" step="any"
                   class="input" value="${m.bazar}" />
          </label>
          <label class="input-group">
            <span class="input-label">Utility (${this.currency})</span>
            <input data-field="utility" type="number" inputmode="decimal" min="0" step="any"
                   class="input" value="${m.utility}" />
          </label>
        </div>

        <div class="member-breakdown">
          <div class="breakdown-row">
            <span class="breakdown-label">Meal cost</span>
            <strong data-meal-cost>${this._money(m.mealCost, 2)}</strong>
          </div>
          <div class="breakdown-row">
            <span class="breakdown-label">Utility share</span>
            <strong data-utility-share>${this._money(m.utilityShare, 2)}</strong>
          </div>
          <div class="breakdown-row">
            <span class="breakdown-label">Total cost</span>
            <strong data-total-cost>${this._money(m.totalCost, 2)}</strong>
          </div>
          <div class="breakdown-row">
            <span class="breakdown-label">Balance</span>
            <strong data-balance class="breakdown-value ${balanceCls}">
              ${this._sign(m.status)}${this._money(m.amount, 2)}
            </strong>
          </div>
        </div>
      </div>
    `;
  }

  _badge(m) {
    if (m.status === 'refund') return { label: 'Receives Refund', cls: 'badge-refund' };
    if (m.status === 'due')    return { label: 'Due to Pay',      cls: 'badge-due' };
    return { label: 'Settled', cls: 'badge-settled' };
  }

  _balanceClass(status) {
    return status === 'refund' ? 'text-refund'
         : status === 'due'    ? 'text-due'
         :                       'text-settled';
  }

  _sign(status) {
    return status === 'refund' ? '+' : status === 'due' ? '−' : '';
  }

  _money(value, decimals = 2) {
    const n = Number(value) || 0;
    return `${this.currency}${n.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}`;
  }

  _initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  _avatarColor(seed) {
    const palette = [
      ['#d1fae5', '#047857'],
      ['#e0f2fe', '#0369a1'],
      ['#ede9fe', '#6d28d9'],
      ['#fef3c7', '#b45309'],
      ['#ffe4e6', '#be123c'],
      ['#cffafe', '#0e7490'],
    ];
    let hash = 0;
    const text = String(seed);
    for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    const [bg, fg] = palette[hash % palette.length];
    const key = `av-${hash.toString(36)}`;
    if (!document.getElementById(key)) {
      const style = document.createElement('style');
      style.id = key;
      style.textContent = `.${key}{background:${bg};color:${fg};}`;
      document.head.appendChild(style);
    }
    return key;
  }

  _attr(value) {
    return String(value).replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
  }
}