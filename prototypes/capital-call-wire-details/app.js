/* =============================================================================
   Interro — Capital Call Wire Instructions (mobile widget prototype)

   Screens inside a 390px frame:
     1. "choose"  — investor picks domestic vs. international origin
     2. "origin"  — international only: which country is YOUR bank in?
     3. "details" — wire instructions, localized to that bank's own field names

   The "origin" step is the feature under evaluation and is gated behind the
   `localize` dev toggle. Rationale: Interro's instructions and the payer's bank
   form use different words for the same thing (Empfänger / Beneficiary,
   Verwendungszweck / Reference), and the payer resolves that mismatch by
   guessing. Naming the field in the payer's own vocabulary removes the guess.

   The question asked is deliberately "where is your BANK", not "where are you"
   or "where is your fund domiciled" — a Cayman fund banking in New York sends a
   domestic wire, and a US person banking in Singapore does not. Only the bank's
   location determines the form the payer will be looking at.

   All values are fabricated demo data. Field NAMES come from the research in
   /International Wire Address Formats v2.md — see prototypes/shared/wireFields.js.
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
  screen: 'choose',       // 'choose' | 'origin' | 'details'
  route: null,            // 'domestic' | 'international'
  pending: null,          // selection on screen 1 before Continue
  bankCountry: null,      // country object — the payer's OWN bank's jurisdiction
  bankCountryErr: false,  // tried to continue without picking one
  layout: 'stacked',      // 'stacked' | 'side'      — dev tools
  amountStyle: 'band',    // 'band' | 'plain'          — dev tools
  dueStyle: 'row',        // 'row' | 'inline'          — dev tools
  showLp: false,          // LP name as a subheader    — dev tools
  memoStyle: 'required',  // 'required' | 'recommended' — dev tools
  additional: false,      // Additional Payment Information accordion — dev tools
  addlOpen: false,        // accordion expanded?
  localize: true,         // the origin screen + localized labels — dev tools
  usLabels: true,         // U.S. equivalent as a row subheader   — dev tools
};

/** The localized instruction set is only reachable on the international route
    with the feature on and a country actually chosen. */
const localizing = () =>
  state.localize && state.route === 'international' && !!state.bankCountry;

/** Field-name schema for the chosen sending-bank country, or null to fall back
    to the generic English international instructions. */
const schema = () =>
  (localizing() && window.WIRE_SEND[state.bankCountry.code]) || null;

const app = document.getElementById('app');
const scroll = document.getElementById('scroll');
const progress = document.getElementById('progress');
const modalRoot = document.getElementById('modal-root');

/* Deep links, so a variant can be opened, bookmarked or screenshotted directly:
     ?route=international
     ?route=international&bank=DE          → localized German instructions
     ?route=domestic&additional=1
     ?layout=side&memo=recommended
     ?localize=0                           → feature off, old two-screen flow */
(function readUrl() {
  const q = new URLSearchParams(location.search);
  if (q.get('localize') === '0') state.localize = false;
  if (q.get('us') === '0') state.usLabels = false;

  const bank = (q.get('bank') || '').toUpperCase();
  if (bank) state.bankCountry = window.countryByCode(bank);

  const r = q.get('route');
  if (r === 'domestic' || r === 'international') {
    state.route = r;
    state.pending = r;
    // Landing straight on details needs a country when localizing, otherwise
    // the deep link silently degrades to the generic instructions.
    state.screen = (r === 'international' && state.localize && !state.bankCountry)
      ? 'origin' : 'details';
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
 *   key       — stable identifier, used to look up the local field name for the
 *               payer's own bank in window.WIRE_SEND[cc].labels.
 *   intlOnly  — field exists only on the international route.
 *   addlOnly  — field belongs in the "Additional Payment Information" panel
 *               when that panel is enabled on the domestic route.
 *
 * Values never change by jurisdiction — Interro's receiving account is the same
 * account whoever is paying into it. Only the LABELS change.
 */
function rows() {
  const base = [
    { key: 'beneficiaryName', label: 'Beneficiary Name', value: BENEFICIARY.name },
    { key: 'beneficiaryAddress', label: 'Beneficiary Address', value: BENEFICIARY.address },
    { key: 'account', label: 'Beneficiary Account Number', value: BENEFICIARY.account, mono: true },
    {
      key: 'aba',
      label: 'Routing Number (ABA / Fedwire)',
      value: BANK.aba,
      mono: true,
      note: 'Nine-digit U.S. routing number.',
    },
    {
      key: 'swift',
      label: 'SWIFT / BIC Code',
      value: BANK.swift,
      mono: true,
      intlOnly: true,
      addlOnly: true,
      note: 'Required to route the payment into the U.S. banking system from a foreign bank.',
    },
    { key: 'bankName', label: 'Receiving Bank', value: BANK.name },
    { key: 'bankAddress', label: 'Bank Address', value: BANK.address },
    { key: 'bankCountry', label: 'Bank Country', value: BANK.country, intlOnly: true, addlOnly: true },
    {
      key: 'correspondent',
      label: 'Correspondent Bank',
      value: 'Not required',
      intlOnly: true,
      note: 'JPMorgan Chase is directly reachable on the SWIFT network — no intermediary needed.',
    },
    {
      key: 'memo',
      label: 'Wire Memo / Reference',
      value: CALL.memoCode,
      mono: true,
      note: 'Must appear in the payment reference field so Interro can auto-match your funds.',
    },
    { key: 'amount', label: 'Amount', value: money(CALL.amount, CALL.currency), mono: true },
    {
      key: 'currency',
      label: 'Currency',
      value: 'USD',
      note: state.route === 'international'
        ? 'Send in USD. Do not convert — your bank should debit your account in local currency.'
        : null,
    },
    {
      key: 'charges',
      label: 'Charges / Fee Instruction',
      value: 'OUR — originator pays all sending and correspondent fees',
      intlOnly: true,
      note: 'Ensures the full capital call amount arrives with no deductions.',
    },
  ];

  const s = schema();
  if (!s) return base;

  // Relabel in the payer's own bank vocabulary, keeping the English term as a
  // subheader so the row is still checkable against Interro's own records.
  const localized = base.map((r) => {
    const loc = s.labels[r.key];
    if (!loc) return r;
    return { ...r, localLabel: loc.local, usLabel: loc.us || r.label, note: loc.note || r.note };
  });

  // Country-specific fields that have no U.S. counterpart at all get appended
  // and flagged — these are the rows that actually strand wires.
  const extras = (s.extras || []).map((x) => ({
    key: `x_${x.local}`,
    localLabel: x.local,
    usLabel: x.us,
    label: x.us,
    value: typeof x.value === 'function' ? x.value(CALL) : x.value,
    note: x.note,
    mono: !!x.mono,
    intlOnly: true,
    localExtra: true,
  }));

  return localized.concat(extras);
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
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/></svg>`,
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

/* Screen 2 (international route only) — where is the payer's own bank?

   One question per screen. The answer changes nothing about where the money goes
   — Interro's account is fixed — it changes only the words used to describe it,
   which is precisely the thing that goes wrong today. */
function screenOrigin() {
  const c = state.bankCountry;
  const s = c && window.WIRE_SEND[c.code];
  const friction = c && window.WIRE_SEND_FRICTION[c.code];

  // Picking the U.S. here is self-contradictory: a US-to-US wire is domestic.
  // Say so rather than silently rendering "international" instructions.
  const contradiction = s && s.sameCountry;

  let echo = '';
  if (contradiction) {
    echo = `
      <div class="originecho originecho--warn">
        <p class="originecho__label">Check this</p>
        <p class="originecho__val">
          A wire from a U.S. bank to Interro's U.S. bank is a <strong>domestic</strong>
          wire — it doesn't need SWIFT routing or fee instructions. Go back and choose
          Domestic wire instead.
        </p>
      </div>`;
  } else if (c && s) {
    echo = `
      <div class="originecho">
        <p class="originecho__label">What this changes</p>
        <p class="originecho__val">
          Your instructions will use <strong>${s.lang}</strong> field names as they appear
          on your bank's form${s.extras.length
            ? `, plus ${s.extras.length} requirement${s.extras.length > 1 ? 's' : ''} specific
               to sending money out of ${c.name}`
            : ''}.
        </p>
        ${friction ? `<p class="originecho__friction">${ICON.warn} ${friction}</p>` : ''}
      </div>`;
  } else if (c) {
    // Known country, no schema — be honest instead of pretending.
    echo = `
      <div class="originecho">
        <p class="originecho__label">What this changes</p>
        <p class="originecho__val">
          Interro doesn't yet have verified field names for <strong>${c.name}</strong>, so
          you'll get the standard international instructions in English.
        </p>
      </div>`;
  }

  return `
    <h1>Where is your bank located?</h1>

    <div class="originnote">
      ${ICON.info}
      <p>
        The bank you're sending <em>from</em> — not where you or your fund are based.
        Banks label wire fields differently by country, so this lets Interro name each
        field the way your bank does.
      </p>
    </div>

    <div class="fgroup">
      <label class="flabel" for="country-trigger">
        Country of your bank <span class="req">*</span>
      </label>
      ${CountryPicker.trigger({
        selected: c,
        placeholder: 'Select country',
        error: state.bankCountryErr,
      })}
      ${state.bankCountryErr
        ? '<p class="ferror">Select the country your bank is in to continue.</p>'
        : ''}
    </div>

    ${echo}

    <div class="actions">
      <button class="btn btn--primary" id="origin-continue">
        View wire instructions →
      </button>
      <button class="btn btn--quiet" id="origin-back">← Back</button>
    </div>`;
}

/* Screen 3 — wire instructions. */
function screenDetails() {
  const isIntl = state.route === 'international';
  const all = rows();

  // On the domestic route with the accordion on, intl-only fields that are
  // flagged addlOnly move out of the main table and into the panel.
  const inPanel = (r) => !isIntl && state.additional && r.addlOnly;

  const main = all
    .filter((r) => !inPanel(r) && (isIntl || !r.intlOnly))
    .map((r) => {
      // Fields the payer's own regulator demands, with no U.S. counterpart —
      // gold rail, because these are the ones that strand the wire.
      if (r.localExtra) {
        return rowHtml(r, 'row row--local-extra', 'Required by your bank', 'tag tag--gold', false);
      }
      // Intl-only fields keep the green rail, but once we're localizing the
      // "International only" tag is noise — every row here is international.
      if (r.intlOnly && !localizing()) {
        return rowHtml(r, 'row row--intl', 'International only', 'tag', false);
      }
      return rowHtml(r, r.intlOnly ? 'row row--intl' : 'row', null, null, false);
    })
    .join('');

  const panelRows = all.filter(inPanel);
  const s = schema();

  return `
    <h1>Wire instructions for your capital call</h1>

    ${s ? `
      <div class="localbar">
        ${CountryPicker.chip(state.bankCountry.code)}
        <div>
          <p class="localbar__title">Named for a ${s.lang}-language bank form</p>
          <p class="localbar__sub">
            Interro's own term is shown under each field${s.unverified
              ? '. Field names for this country are indicative — confirm against your bank\'s form'
              : ''}.
          </p>
        </div>
      </div>` : ''}

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

  // Localized: the payer's own term leads, Interro's term drops to a subheader.
  // The subheader can be switched off from dev tools to test the denser reading.
  const label = r.localLabel
    ? `<div class="row__label row__label--loc">${r.localLabel}${tag}${
        state.usLabels && r.usLabel ? `<span class="row__us">${r.usLabel}</span>` : ''}</div>`
    : `<div class="row__label">${r.label}${tag}</div>`;

  return `
    <div class="${cls}">
      ${label}
      <div class="row__value ${r.mono ? 'mono' : ''}">${r.value}${note}</div>
      ${copy}
    </div>`;
}

const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');

/* ----------------------------------------------------------------- plumbing */

/* The flow is 2 steps domestic, 3 international-with-localization. The bar
   reflects the route actually being taken rather than padding a phantom step —
   a domestic payer should never see a segment they will not reach. */
function totalSteps() {
  if (state.screen === 'origin') return 3;
  return state.route === 'international' && state.localize ? 3 : 2;
}

/** Segmented step bar: segments light green up to and including the current step. */
function renderProgress() {
  const step = { choose: 1, origin: 2, details: totalSteps() }[state.screen];
  const total = totalSteps();
  progress.innerHTML = Array.from({ length: total }, (_, i) =>
    `<span class="progress__seg ${i < step ? 'is-on' : ''}"></span>`).join('');
  progress.setAttribute('aria-valuemax', String(total));
  progress.setAttribute('aria-valuenow', String(step));
}

const SCREENS = {
  choose: screenChoose,
  origin: screenOrigin,
  details: screenDetails,
};

function render() {
  app.innerHTML = SCREENS[state.screen]();
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

  // Country picker — opens the shared in-frame sheet.
  if (e.target.closest('#country-trigger')) {
    return CountryPicker.open({
      root: modalRoot,
      selected: state.bankCountry,
      title: 'Where is your bank?',
      onSelect: (c) => {
        state.bankCountry = c;
        state.bankCountryErr = false;
        render();
      },
    });
  }

  const btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'continue':
      state.route = state.pending;
      // International + feature on → ask which country before showing anything.
      state.screen = (state.route === 'international' && state.localize)
        ? 'origin' : 'details';
      return render();
    case 'origin-continue':
      if (!state.bankCountry) {
        state.bankCountryErr = true;
        return render();
      }
      state.screen = 'details';
      return render();
    case 'origin-back':
      state.screen = 'choose';
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

/* The country <select> mirrors the in-widget picker but stays a plain select —
   dev tools are a console, not a showcase. Countries with a verified field
   schema are marked, so it is obvious which ones exercise the feature. */
(function fillDevCountries() {
  const sel = dev.querySelector('#dev-country');
  sel.innerHTML = window.COUNTRIES.map((c) => {
    const has = !!window.WIRE_SEND[c.code];
    return `<option value="${c.code}">${has ? '● ' : '○ '}${c.name}</option>`;
  }).join('');
  sel.value = 'DE';   // a localized default, so the feature is visible on open
})();

dev.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-goto]');
  if (nav) {
    const to = nav.dataset.goto;
    if (to === 'choose') {
      Object.assign(state, { screen: 'choose', route: null, pending: null, addlOpen: false });
    } else if (to === 'origin') {
      // Jumping here implies the international route and the feature on.
      Object.assign(state, {
        screen: 'origin', route: 'international', pending: 'international',
        localize: true, bankCountryErr: false,
      });
    } else {
      Object.assign(state, { screen: 'details', route: to, pending: to });
      // Landing on international details with localization on needs a country.
      if (to === 'international' && state.localize && !state.bankCountry) {
        state.bankCountry = window.countryByCode(dev.querySelector('#dev-country').value);
      }
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
      bankCountry: null, bankCountryErr: false,
      layout: 'stacked', amountStyle: 'band', dueStyle: 'row', showLp: false,
      memoStyle: 'required', additional: false, addlOpen: false,
      localize: true, usLabels: true,
    });
    dev.querySelector('#dev-country').value = 'DE';
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

  // Master switch for the whole localization feature.
  if (e.target.id === 'dev-origin') {
    state.localize = e.target.checked;
    // Turning it off mid-flow would leave the payer stranded on a screen that no
    // longer exists, so fall back to the details page.
    if (!state.localize && state.screen === 'origin') state.screen = 'details';
    return render();
  }
  if (e.target.id === 'dev-uslabels') {
    state.usLabels = e.target.checked;
    return render();
  }
  if (e.target.id === 'dev-country') {
    state.bankCountry = window.countryByCode(e.target.value);
    state.bankCountryErr = false;
    return render();
  }
});

/** Reflect state back into the dev panel so it never lies about the view. */
function syncDev() {
  const active = state.screen === 'choose' ? 'choose'
    : state.screen === 'origin' ? 'origin'
    : state.route;
  dev.querySelectorAll('[data-goto]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.goto === active));

  dev.querySelector('#dev-origin').checked = state.localize;
  dev.querySelector('#dev-uslabels').checked = state.usLabels;
  // Dim the sub-controls when the parent feature is off, rather than removing
  // them — the panel must not reflow under the cursor.
  dev.querySelector('#dev-origin-sub').classList.toggle('is-off', !state.localize);
  // Keep the select honest when the country was chosen inside the widget.
  if (state.bankCountry) dev.querySelector('#dev-country').value = state.bankCountry.code;
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
  const s = schema();
  const lines = [
    `${isIntl ? 'INTERNATIONAL' : 'DOMESTIC'} WIRE INSTRUCTIONS`,
    CALL.fund,
    `${CALL.callNo} — ${CALL.investor} (${CALL.investorId})`,
  ];
  if (s) {
    lines.push(`Field names as labelled on a ${s.lang}-language bank form (${state.bankCountry.name}).`);
  }
  lines.push('');

  rows()
    .filter((r) => isIntl || !r.intlOnly || (state.additional && r.addlOnly))
    .forEach((r) => {
      // Pasted into an email to a bank, the local term has to lead — but the
      // English gloss has to survive too, or the payer's own records won't match.
      const label = r.localLabel && r.usLabel
        ? `${r.localLabel} (${r.usLabel})`
        : (r.localLabel || r.label);
      lines.push(`${label}: ${r.value}`);
      if (r.localExtra && r.note) lines.push(`    ↳ ${r.note}`);
    });

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
