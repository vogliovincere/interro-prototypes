/* =============================================================================
   Interro — Capital Call Wire Instructions (mobile widget prototype)

   Two screens inside a 390px frame:
     1. "choose"  — investor picks domestic vs. international origin
     2. "details" — wire instructions, conditionally including SWIFT/BIC

   All data is fabricated demo data. The only structural rule that matters for
   the marketing story lives in `rows()`: fields flagged `intlOnly` are rendered
   for the international route and omitted entirely for domestic — except when
   the "Additional Payment Information" accordion is enabled, which relocates
   the SWIFT/BIC into a progressive-disclosure panel on the domestic route.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------- demo data */

const CALL = {
  fund: 'Meridian Growth Partners III',
  callNo: 'Capital Call #3 of 8',
  investor: 'Whitfield Family Office, LLC',
  investorId: 'LP-2291',
  amount: 2500000,
  currency: 'USD',
  dueDate: 'August 14, 2026',
  memoCode: '8F42QK',        // 6-character alphanumeric, always
};

const BENEFICIARY = {
  name: 'Meridian Growth Partners III',
  address: '1200 Brickell Avenue, Suite 1800, Miami, FL 33131, United States',
  account: '4738 2910 5567',
};

const BANK = {
  name: 'JPMorgan Chase Bank, N.A.',
  address: '383 Madison Avenue, New York, NY 10179, United States',
  aba: '021000021',
  swift: 'CHASUS33XXX',
  country: 'United States',
};

const money = (n, ccy) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: ccy, minimumFractionDigits: 2,
  }).format(n);

/* --------------------------------------------------------------- app state */

const state = {
  screen: 'choose',       // 'choose' | 'details'
  route: null,            // 'domestic' | 'international'
  pending: null,          // selection on screen 1 before Continue
  layout: 'stacked',      // 'stacked' | 'side'      — dev tools
  amountStyle: 'band',    // 'band' | 'plain'          — dev tools
  dueStyle: 'row',        // 'row' | 'inline'          — dev tools
  showLp: false,          // LP name as a subheader    — dev tools
  memoStyle: 'required',  // 'required' | 'recommended' — dev tools
  additional: false,      // Additional Payment Information accordion — dev tools
  addlOpen: false,        // accordion expanded?
};

const app = document.getElementById('app');
const scroll = document.getElementById('scroll');
const progress = document.getElementById('progress');
const modalRoot = document.getElementById('modal-root');

/* Deep links, so a variant can be opened, bookmarked or screenshotted directly:
     ?route=international
     ?route=domestic&additional=1
     ?layout=side&memo=recommended */
(function readUrl() {
  const q = new URLSearchParams(location.search);
  const r = q.get('route');
  if (r === 'domestic' || r === 'international') {
    state.route = r;
    state.pending = r;
    state.screen = 'details';
  }
  if (q.get('additional') === '1') state.additional = true;
  if (q.get('layout') === 'side') state.layout = 'side';
  if (q.get('amount') === 'plain') state.amountStyle = 'plain';
  if (q.get('due') === 'inline') state.dueStyle = 'inline';
  if (q.get('lp') === '1') state.showLp = true;
  if (q.get('memo') === 'recommended') state.memoStyle = 'recommended';
})();

/* ------------------------------------------------------- instruction model */

/**
 * The full instruction set.
 *   intlOnly  — field exists only on the international route.
 *   addlOnly  — field belongs in the "Additional Payment Information" panel
 *               when that panel is enabled on the domestic route.
 */
function rows() {
  return [
    { label: 'Beneficiary Name', value: BENEFICIARY.name },
    { label: 'Beneficiary Address', value: BENEFICIARY.address },
    { label: 'Beneficiary Account Number', value: BENEFICIARY.account, mono: true },
    {
      label: 'Routing Number (ABA / Fedwire)',
      value: BANK.aba,
      mono: true,
      note: 'Nine-digit U.S. routing number.',
    },
    {
      label: 'SWIFT / BIC Code',
      value: BANK.swift,
      mono: true,
      intlOnly: true,
      addlOnly: true,
      note: 'Required to route the payment into the U.S. banking system from a foreign bank.',
    },
    { label: 'Receiving Bank', value: BANK.name },
    { label: 'Bank Address', value: BANK.address },
    { label: 'Bank Country', value: BANK.country, intlOnly: true, addlOnly: true },
    {
      label: 'Correspondent Bank',
      value: 'Not required',
      intlOnly: true,
      note: 'JPMorgan Chase is directly reachable on the SWIFT network — no intermediary needed.',
    },
    {
      label: 'Wire Memo / Reference',
      value: CALL.memoCode,
      mono: true,
      note: 'Must appear in the payment reference field so Interro can auto-match your funds.',
    },
    { label: 'Amount', value: money(CALL.amount, CALL.currency), mono: true },
    {
      label: 'Currency',
      value: 'USD',
      note: state.route === 'international'
        ? 'Send in USD. Do not convert — your bank should debit your account in local currency.'
        : null,
    },
    {
      label: 'Charges / Fee Instruction',
      value: 'OUR — originator pays all sending and correspondent fees',
      intlOnly: true,
      note: 'Ensures the full capital call amount arrives with no deductions.',
    },
  ];
}

/* Inline SVG icons — flag emoji are unreliable on Windows Chrome. */
const ICON = {
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M3 9.5 12 4l9 5.5"/><path d="M5 10v9"/><path d="M19 10v9"/>
           <path d="M9 19v-5.5"/><path d="M15 19v-5.5"/><path d="M3 19h18"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/>
           <path d="M12 3.5c2.3 2.4 3.5 5.4 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.4-3.5-8.5S9.7 5.9 12 3.5z"/></svg>`,
  chevron: `<svg class="accordion__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="m6 9 6 6 6-6"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M12 9v4"/><path d="M12 17h.01"/>
           <path d="M10.3 3.9 2.4 17.5A1.9 1.9 0 0 0 4 20.4h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/></svg>`,
};

/* -------------------------------------------------------------- rendering */

function callSummary() {
  const ownRow = state.dueStyle === 'row';
  return `
    <section class="card callcard">
      <div class="callcard__head">
        <p class="callcard__fund">${CALL.fund}</p>
        ${state.showLp ? `<p class="callcard__lp">${CALL.investor}</p>` : ''}
      </div>
      <div class="callcard__amt callcard__amt--${state.amountStyle}">
        <div>
          <span class="label">Amount due</span>
          <span class="value">${money(CALL.amount, CALL.currency)}</span>
        </div>
        ${ownRow ? '' : `<span class="due">Due ${CALL.dueDate}</span>`}
      </div>
      ${ownRow ? `
        <div class="callcard__due callcard__due--${state.amountStyle}">
          <span class="label">Due date</span>
          <span class="value">${CALL.dueDate}</span>
        </div>` : ''}
    </section>`;
}

/* Screen 1 — payment options.
   One component, two layouts. The side-by-side variant swaps in the short copy
   because ~173px of card width cannot carry a full sentence legibly. */
const OPTIONS = [
  { id: 'domestic', icon: ICON.bank, title: 'Domestic wire' },
  { id: 'international', icon: ICON.globe, title: 'International wire' },
];

function screenChoose() {
  const side = state.layout === 'side';

  const opt = (o) => `
    <button class="choice" type="button" data-route="${o.id}"
            aria-pressed="${state.pending === o.id}">
      <span class="choice__radio" aria-hidden="true"></span>
      <span class="choice__icon">${o.icon}</span>
      <span class="choice__text">
        <span class="choice__title">${o.title}</span>
      </span>
    </button>`;

  return `
    <h1>How are you funding this capital call?</h1>

    ${callSummary()}

    <div class="choices choices--${side ? 'side' : 'stacked'}">
      ${OPTIONS.map(opt).join('')}
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="continue" ${state.pending ? '' : 'disabled'}>
        View wire instructions →
      </button>
    </div>`;
}

/* Screen 2 — wire instructions. */
function screenDetails() {
  const isIntl = state.route === 'international';
  const all = rows();

  // On the domestic route with the accordion on, intl-only fields that are
  // flagged addlOnly move out of the main table and into the panel.
  const inPanel = (r) => !isIntl && state.additional && r.addlOnly;

  const main = all
    .filter((r) => !inPanel(r) && (isIntl || !r.intlOnly))
    .map((r) => rowHtml(r, r.intlOnly ? 'row row--intl' : 'row',
                        r.intlOnly ? 'International only' : null, 'tag', false))
    .join('');

  const panelRows = all.filter(inPanel);

  return `
    <h1>Wire instructions for your capital call</h1>

    ${memoBlock()}

    <section class="card instr" id="instr">
      <div class="instr__head">
        <h2>${isIntl ? 'International wire details' : 'Domestic wire details'}</h2>
        <span>${all.filter((r) => isIntl || !r.intlOnly).length} fields</span>
      </div>
      ${main}
    </section>

    ${panelRows.length ? accordion(panelRows) : ''}

    <div class="actions">
      <button class="btn btn--primary" data-copy-all>Copy all instructions</button>
      <button class="btn btn--ghost" id="print">Print / Save as PDF</button>
      <button class="btn btn--quiet" id="back">← Start over</button>
    </div>`;
}

/* The memo hero has two treatments. "required" is the imperative gold
   treatment; "recommended" is a softer blue advisory — same gradient shape,
   different semantics, so the difference reads as tone not as a new component. */
function memoBlock() {
  const rec = state.memoStyle === 'recommended';
  return `
    <section class="memo memo--${rec ? 'recommended' : 'required'}">
      <div class="memo__label">${rec ? 'Recommended wire memo code' : 'Required wire memo code'}</div>
      <div class="memo__row">
        <span class="memo__code">${CALL.memoCode}</span>
        <button class="copy" data-copy="${CALL.memoCode}">Copy</button>
      </div>
      <p class="memo__hint">
        ${rec
          ? `Including this in your bank's <em>reference</em> field helps Interro match
             your payment immediately. Without it, matching may take an extra day.`
          : `Enter this in your bank's <em>reference</em>, <em>memo</em>, or
             <em>message to beneficiary</em> field. Wires received without it may be
             delayed while Interro identifies the sender.`}
      </p>
    </section>`;
}

function accordion(panelRows) {
  const body = panelRows.map((r) => rowHtml(r, 'row', null, null, false)).join('');
  return `
    <section class="accordion ${state.addlOpen ? 'is-open' : ''}" id="addl">
      <button class="accordion__btn" type="button" id="addl-toggle"
              aria-expanded="${state.addlOpen}" aria-controls="addl-panel">
        Additional Payment Information
        <span class="accordion__hint">Optional</span>
        ${ICON.chevron}
      </button>
      <div class="accordion__panel" id="addl-panel">${body}</div>
    </section>`;
}

function rowHtml(r, cls, tagText, tagCls, struck) {
  const tag = tagText ? `<span class="${tagCls}">${tagText}</span>` : '';
  const note = r.note ? `<span class="row__note">${r.note}</span>` : '';
  const copy = struck ? '' : `<button class="copy" data-copy="${escapeAttr(r.value)}">Copy</button>`;
  return `
    <div class="${cls}">
      <div class="row__label">${r.label}${tag}</div>
      <div class="row__value ${r.mono ? 'mono' : ''}">${r.value}${note}</div>
      ${copy}
    </div>`;
}

const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');

/* ----------------------------------------------------------------- plumbing */

const STEPS = 2;

/** Segmented step bar: segments light green up to and including the current step. */
function renderProgress() {
  const step = state.screen === 'choose' ? 1 : 2;
  progress.innerHTML = Array.from({ length: STEPS }, (_, i) =>
    `<span class="progress__seg ${i < step ? 'is-on' : ''}"></span>`).join('');
  progress.setAttribute('aria-valuenow', String(step));
}

function render() {
  app.innerHTML = state.screen === 'choose' ? screenChoose() : screenDetails();
  renderProgress();
  syncDev();
  scroll.scrollTo({ top: 0, behavior: 'smooth' });
}

app.addEventListener('click', (e) => {
  const choice = e.target.closest('.choice');
  if (choice) {
    // Clicking the selected option again clears it — the investor can back out
    // of a choice without having to pick the other one.
    const id = choice.dataset.route;
    state.pending = state.pending === id ? null : id;
    return render();
  }

  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) return copy(copyBtn.dataset.copy, copyBtn, 'Copied');

  if (e.target.closest('[data-copy-all]')) {
    return copy(plainText(), e.target.closest('[data-copy-all]'), 'All instructions copied');
  }

  if (e.target.closest('#addl-toggle')) {
    state.addlOpen = !state.addlOpen;
    const el = document.getElementById('addl');
    el.classList.toggle('is-open', state.addlOpen);
    el.querySelector('.accordion__btn').setAttribute('aria-expanded', String(state.addlOpen));
    return;
  }

  const btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'continue':
      state.route = state.pending;
      state.screen = 'details';
      return render();
    case 'back':
      return confirmStartOver();
    case 'print':
      return window.print();
  }
});

/* ------------------------------------------------- start-over confirmation */

function confirmStartOver() {
  modalRoot.innerHTML = `
    <div class="scrim" role="dialog" aria-modal="true" aria-labelledby="so-title">
      <div class="modal">
        <div class="modal__icon">${ICON.warn}</div>
        <h2 id="so-title">Cancel these wire details?</h2>
        <p>
          Starting over cancels the wire instructions generated for this capital
          call, including memo code <strong>${CALL.memoCode}</strong>. If you have
          already sent them to your bank, do not start over — the payment may not
          be matched to your commitment.
        </p>
        <div class="modal__actions">
          <button class="btn btn--danger" id="so-confirm">Yes, cancel and start over</button>
          <button class="btn btn--ghost" id="so-cancel">Keep my wire details</button>
        </div>
      </div>
    </div>`;

  const close = () => { modalRoot.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  modalRoot.querySelector('#so-cancel').addEventListener('click', close);
  modalRoot.querySelector('.scrim').addEventListener('click', (e) => {
    if (e.target.classList.contains('scrim')) close();
  });
  modalRoot.querySelector('#so-confirm').addEventListener('click', () => {
    close();
    Object.assign(state, { screen: 'choose', route: null, pending: null, addlOpen: false });
    render();
    toast('Wire details canceled');
  });
  modalRoot.querySelector('#so-confirm').focus();
}

/* ------------------------------------------------------------- dev tools */

const dev = document.querySelector('.dev');

dev.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-goto]');
  if (nav) {
    const to = nav.dataset.goto;
    if (to === 'choose') {
      Object.assign(state, { screen: 'choose', route: null, pending: null, addlOpen: false });
    } else {
      Object.assign(state, { screen: 'details', route: to, pending: to });
    }
    modalRoot.innerHTML = '';
    return render();
  }

  const layout = e.target.closest('[data-layout]');
  if (layout) { state.layout = layout.dataset.layout; return render(); }

  const amount = e.target.closest('[data-amount]');
  if (amount) { state.amountStyle = amount.dataset.amount; return render(); }

  const due = e.target.closest('[data-due]');
  if (due) { state.dueStyle = due.dataset.due; return render(); }

  const memo = e.target.closest('[data-memo]');
  if (memo) { state.memoStyle = memo.dataset.memo; return render(); }

  if (e.target.closest('#dev-reset')) {
    Object.assign(state, {
      screen: 'choose', route: null, pending: null,
      layout: 'stacked', amountStyle: 'band', dueStyle: 'row', showLp: false,
      memoStyle: 'required', additional: false, addlOpen: false,
    });
    modalRoot.innerHTML = '';
    return render();
  }
});

dev.addEventListener('change', (e) => {
  if (e.target.id === 'dev-addl') {
    state.additional = e.target.checked;
    state.addlOpen = false;
    return render();
  }
  if (e.target.id === 'dev-lp') {
    state.showLp = e.target.checked;
    return render();
  }
});

/** Reflect state back into the dev panel so it never lies about the view. */
function syncDev() {
  const active = state.screen === 'choose' ? 'choose' : state.route;
  dev.querySelectorAll('[data-goto]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.goto === active));
  dev.querySelectorAll('[data-layout]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.layout === state.layout));
  dev.querySelectorAll('[data-amount]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.amount === state.amountStyle));
  dev.querySelectorAll('[data-due]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.due === state.dueStyle));
  dev.querySelectorAll('[data-memo]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.memo === state.memoStyle));
  dev.querySelector('#dev-addl').checked = state.additional;
  dev.querySelector('#dev-lp').checked = state.showLp;
}

/* ------------------------------------------------------------------ copy */

/** Plain-text instruction block, mirroring exactly what is on screen. */
function plainText() {
  const isIntl = state.route === 'international';
  const lines = [
    `${isIntl ? 'INTERNATIONAL' : 'DOMESTIC'} WIRE INSTRUCTIONS`,
    CALL.fund,
    `${CALL.callNo} — ${CALL.investor} (${CALL.investorId})`,
    '',
  ];
  rows()
    .filter((r) => isIntl || !r.intlOnly || (state.additional && r.addlOnly))
    .forEach((r) => lines.push(`${r.label}: ${r.value}`));
  lines.push('', `Wire memo code: ${CALL.memoCode} — ${
    state.memoStyle === 'recommended' ? 'recommended.' : 'must be included.'}`);
  return lines.join('\n');
}

function copy(text, btn, msg) {
  const label = btn.textContent;
  navigator.clipboard.writeText(text).then(() => {
    btn.classList.add('done');
    if (btn.classList.contains('copy')) btn.textContent = '✓';
    toast(msg);
    setTimeout(() => {
      btn.classList.remove('done');
      btn.textContent = label;
    }, 1600);
  }).catch(() => toast('Copy blocked by the browser — select the text manually'));
}

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

render();
