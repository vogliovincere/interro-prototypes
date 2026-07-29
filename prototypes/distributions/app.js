/* =============================================================================
   Interro — Receive a Distribution (mobile widget prototype)

   Four screens inside the same 390px frame as the capital-call widget:
     1. "intro"   — what this is and why it is being asked
     2. "country" — which country is the recipient's bank in
     3. "details" — the fields THAT country requires, and only those
     4. "done"    — verifying, then confirmation

   THE PRODUCT POINT. This is the mirror image of the capital-call widget. There,
   the beneficiary is always Interro's U.S. account, so only the payer's
   vocabulary changed. Here the recipient IS the beneficiary and their bank can be
   anywhere — including the United States, which is a perfectly ordinary answer —
   so the actual FIELD SET changes: an IBAN for Germany, ABA + account for the
   U.S., BSB for Australia, IFSC for India, CLABE for Mexico, CPF/CNPJ for Brazil.

   Research established that this branching is real and that a single universal
   form would be silently wrong (research/raw/00-gating.md): it would ask
   IBAN-less recipients for an IBAN they cannot supply, and omit purpose codes
   that cause funds to be returned rather than merely delayed. Collecting the
   right fields here converts a downstream rejection into something that never
   happens.

   Schemas live in ../shared/wireReceive.js. Validation is format-only — Interro
   cannot confirm from a form that an account exists, but it can stop a
   20-character Swiss IBAN, which is what actually goes wrong.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------- demo data */

const DIST = {
  fund: 'Meridian Growth Partners III',
  event: 'Distribution #2 · Q3 2026',
  investor: 'Whitfield Family Office, LLC',
  amount: 486250,
  currency: 'USD',
  expected: 'early September 2026',
};

const money = (n, ccy) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency', currency: ccy, minimumFractionDigits: 2,
  }).format(n);

/* --------------------------------------------------------------- app state */

const state = {
  screen: 'intro',        // 'intro' | 'country' | 'details' | 'done'
  country: null,          // country object — where the RECIPIENT's bank is
  countryErr: false,
  values: {},             // field key → string
  errors: {},             // field key → message
  submitted: false,       // has a failed submit happened? drives error display
  donePhase: 'checking',  // 'checking' | 'success'
  checked: {},            // checklist key → true, during the verifying animation
  usLabels: true,         // dev tools
  hints: true,            // dev tools
};

const app = document.getElementById('app');
const scroll = document.getElementById('scroll');
const progress = document.getElementById('progress');
const modalRoot = document.getElementById('modal-root');

/* Deep links, so a jurisdiction can be opened or screenshotted directly:
     ?country=DE          → straight to the German form
     ?country=US&screen=details
     ?screen=done         → the success screen */
(function readUrl() {
  const q = new URLSearchParams(location.search);
  const cc = (q.get('country') || '').toUpperCase();
  if (cc) state.country = window.countryByCode(cc);

  const s = q.get('screen');
  if (s === 'country' || s === 'done') state.screen = s;
  if (s === 'details' && state.country) state.screen = 'details';
  else if (s === 'details') state.screen = 'country';
  if (q.get('us') === '0') state.usLabels = false;
  if (q.get('hints') === '0') state.hints = false;
})();

/* The dev panel is opt-in: ?dev=1 reveals it, anything else gets the widget on
   its own with every toggle at its default. Hidden is the CSS default, so the
   clean link can never flash the panel before this runs. */
if (new URLSearchParams(location.search).get('dev') === '1') {
  document.documentElement.classList.add('devmode');
}

const schema = () => (state.country ? window.receiveSchema(state.country.code) : null);

/* Inline SVG icons — flag emoji and dingbats are unreliable on Windows Chrome. */
const ICON = {
  info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M12 9v4"/><path d="M12 17h.01"/>
           <path d="M10.3 3.9 2.4 17.5A1.9 1.9 0 0 0 4 20.4h16a1.9 1.9 0 0 0 1.6-2.9L13.7 3.9a1.9 1.9 0 0 0-3.4 0z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="m4 12.5 5.5 5.5L20 7"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <rect x="4.5" y="10.5" width="15" height="10" rx="2"/>
           <path d="M8 10.5V7.8a4 4 0 0 1 8 0v2.7"/></svg>`,
};

/* ============================================================== screen 1 === */

function screenIntro() {
  return `
    <h1>Tell us where to send your distribution</h1>

    <p class="intro__lede">
      ${DIST.fund} has declared a distribution to your account. Interro needs your
      bank details to generate wire instructions that will actually land — the
      required details differ by country.
    </p>

    <section class="card distcard">
      <div class="distcard__head">
        <p class="distcard__fund">${DIST.fund}</p>
        <p class="distcard__meta">${DIST.event} · ${DIST.investor}</p>
      </div>
      <div class="distcard__amt">
        <span class="label">Your distribution</span>
        <span class="value">${money(DIST.amount, DIST.currency)}</span>
      </div>
    </section>

    <ol class="steps">
      <li><strong>Where you bank</strong>Pick the country your bank is in.</li>
      <li><strong>Your account details</strong>We ask only for what banks in that
        country actually require.</li>
      <li><strong>That's it</strong>Funds are expected ${DIST.expected}.</li>
    </ol>

    <div class="originnote">
      ${ICON.lock}
      <p>
        Your details are used only to send this distribution. Takes about two
        minutes — have your account details to hand.
      </p>
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="intro-continue">Get started →</button>
    </div>`;
}

/* ============================================================== screen 2 === */

function screenCountry() {
  const c = state.country;
  const s = c && window.receiveSchema(c.code);

  let echo = '';
  if (c && s) {
    const req = s.fields.filter((f) => f.req === 'required').length;
    echo = `
      <div class="originecho">
        <p class="originecho__label">What we'll ask for</p>
        <p class="originecho__val">
          ${s.generic
            ? `Interro hasn't yet verified the exact requirements for
               <strong>${c.name}</strong>, so you'll get a general form and we may
               follow up to confirm.`
            : `${req} required field${req === 1 ? '' : 's'} for
               <strong>${c.name}</strong> — ${
                 s.usesIban ? 'including your IBAN' : 'no IBAN, since ' + c.name
                 + ' doesn\'t use one'}.`}
        </p>
      </div>`;
  }

  return `
    <h1>Where is your bank located?</h1>

    <div class="originnote">
      ${ICON.info}
      <p>
        The country your <em>bank account</em> is held in — not your nationality or
        where your entity is registered. Banks in different countries need
        different details to receive a wire.
      </p>
    </div>

    <div class="fgroup">
      <label class="flabel" for="country-trigger">
        Country of your bank <span class="req">*</span>
      </label>
      ${CountryPicker.trigger({
        selected: c,
        placeholder: 'Select country',
        error: state.countryErr,
      })}
      ${state.countryErr
        ? '<p class="ferror">Select the country your bank is in to continue.</p>'
        : ''}
    </div>

    ${echo}

    <div class="actions">
      <button class="btn btn--primary" id="country-continue">Continue →</button>
      <button class="btn btn--quiet" id="country-back">← Back</button>
    </div>`;
}

/* ============================================================== screen 3 === */

function fieldHtml(f) {
  const v = state.values[f.key] || '';
  const err = state.submitted ? state.errors[f.key] : null;
  // A tick only once there is something to validate AND it passes — an empty
  // optional field is not an achievement.
  const ok = !err && v.trim() && !validateField(f, v);

  const chip = f.req === 'conditional'
    ? '<span class="reqchip reqchip--conditional">If you have one</span>'
    : f.req === 'optional'
      ? '<span class="reqchip reqchip--optional">Optional</span>'
      : '<span class="req">*</span>';

  const control = f.type === 'select'
    ? `<select class="finput ${err ? 'is-error' : ''} ${ok ? 'is-ok' : ''}"
               id="f-${f.key}" data-field="${f.key}">
         <option value="">Select…</option>
         ${f.options.map((o) =>
           `<option value="${o}" ${v === o ? 'selected' : ''}>${o}</option>`).join('')}
       </select>`
    : `<input type="${f.type === 'tel' ? 'tel' : 'text'}"
              class="finput ${f.type === 'iban' || f.type === 'bic' || f.type === 'code' ? 'mono' : ''}
                     ${err ? 'is-error' : ''} ${ok ? 'is-ok' : ''}"
              id="f-${f.key}" data-field="${f.key}"
              value="${escapeAttr(v)}"
              placeholder="${escapeAttr(f.placeholder || '')}"
              autocomplete="off" spellcheck="false" />`;

  return `
    <div class="fgroup" id="g-${f.key}">
      <label class="flabel" for="f-${f.key}">
        ${f.label}${chip}
        ${state.usLabels && f.us ? `<span class="flabel__us">${f.us}</span>` : ''}
      </label>
      ${control}
      ${ok && f.type !== 'select' ? `<span class="fok">${ICON.check}</span>` : ''}
      ${err ? `<p class="ferror">${err}</p>`
        : (state.hints && f.hint ? `<p class="fhelp">${f.hint}</p>` : '')}
    </div>`;
}

function screenDetails() {
  const c = state.country;
  const s = schema();
  const errKeys = state.submitted ? Object.keys(state.errors) : [];

  return `
    <h1>Your bank details</h1>

    <div class="formctx">
      ${CountryPicker.chip(c.code)}
      <span class="formctx__txt">Using <strong>${c.name}</strong> requirements</span>
      <button class="formctx__change" id="change-country">Change</button>
    </div>

    ${s.gotcha ? `
      <div class="gotcha">
        ${ICON.warn}
        <p>${s.gotcha}</p>
      </div>` : ''}

    ${errKeys.length ? `
      <div class="errsum">
        <p class="errsum__title">${errKeys.length} field${errKeys.length === 1 ? '' : 's'} need attention</p>
        <ul>
          ${errKeys.map((k) => {
            const f = s.fields.find((x) => x.key === k);
            return `<li><button data-jump="${k}">${f ? f.label : k}</button> — ${state.errors[k]}</li>`;
          }).join('')}
        </ul>
      </div>` : ''}

    <form id="wireform" novalidate>
      ${s.fields.map(fieldHtml).join('')}
    </form>

    <div class="actions">
      <button class="btn btn--primary" id="submit">Submit wire details →</button>
      <button class="btn btn--quiet" id="details-back">← Back</button>
    </div>`;
}

/* --------------------------------------------------------------- validation */

/** Returns an error string, or null when the value is acceptable. */
function validateField(f, raw) {
  // IBANs and codes are transcribed by hand from a statement, so spaces are
  // expected input, not user error. Strip before testing.
  const v = (raw || '').replace(/\s+/g, '');

  if (!v) {
    return f.req === 'required' ? `${f.label} is required.` : null;
  }
  if (f.pattern && !new RegExp(f.pattern).test(v)) {
    return f.invalid || `${f.label} doesn't look right.`;
  }
  return null;
}

function validateAll() {
  const s = schema();
  const errors = {};
  s.fields.forEach((f) => {
    const msg = validateField(f, state.values[f.key]);
    if (msg) errors[f.key] = msg;
  });
  state.errors = errors;
  return Object.keys(errors).length === 0;
}

/* ============================================================== screen 4 === */

const CHECKS = [
  { key: 'format', label: 'Account details format' },
  { key: 'bank', label: 'Bank identifier' },
  { key: 'rules', label: 'Country requirements' },
  { key: 'match', label: 'Name and address' },
];

function screenDone() {
  if (state.donePhase === 'checking') {
    return `
      <div class="terminal">
        <h1 style="text-align:center">Checking your details</h1>
        <p class="terminal__sub">
          Interro is validating what you submitted against ${state.country
            ? state.country.name : 'your country'}'s wire requirements.
        </p>
        <div class="checklist">
          ${CHECKS.map((c) => `
            <div class="checkitem ${state.checked[c.key] ? '' : 'is-pending'}">
              ${state.checked[c.key]
                ? `<span class="checkitem__tick">${ICON.check}</span>`
                : '<span class="spinner"></span>'}
              <span>${c.label}</span>
            </div>`).join('')}
        </div>
      </div>`;
  }

  const s = schema();
  // Read back only what they filled in — echoing empty optional rows would pad
  // the screen and bury the fields that matter.
  const filled = s.fields.filter((f) => (state.values[f.key] || '').trim());

  return `
    <div class="terminal">
      <div class="terminal__icon">${ICON.check}</div>
      <h1 class="terminal__heading">You're all set</h1>
      <p class="terminal__sub">
        Interro has what it needs to send your distribution of
        <strong>${money(DIST.amount, DIST.currency)}</strong>. Funds are expected
        ${DIST.expected}.
      </p>

      <section class="card summary instr">
        <div class="summary__head">What you submitted</div>
        ${filled.map((f) => `
          <div class="row">
            <div class="row__label">${f.label}</div>
            <div class="row__value ${f.type === 'iban' || f.type === 'bic' || f.type === 'code' ? 'mono' : ''}">
              ${escapeHtml(state.values[f.key])}
            </div>
          </div>`).join('')}
      </section>

      <div class="actions">
        <button class="btn btn--ghost" id="edit-again">Change these details</button>
      </div>
    </div>`;
}

/** Drives the verifying checklist, then resolves to success. */
let checkTimers = [];
function runChecks() {
  checkTimers.forEach(clearTimeout);
  state.checked = {};
  checkTimers = CHECKS.map((c, i) =>
    setTimeout(() => {
      state.checked[c.key] = true;
      if (state.screen === 'done' && state.donePhase === 'checking') render();
    }, 620 * (i + 1)));
  checkTimers.push(setTimeout(() => {
    if (state.screen !== 'done') return;
    state.donePhase = 'success';
    render();
  }, 620 * (CHECKS.length + 1)));
}

/* ---------------------------------------------------------------- plumbing */

const SCREENS = {
  intro: screenIntro,
  country: screenCountry,
  details: screenDetails,
  done: screenDone,
};

const STEP = { intro: 1, country: 2, details: 3, done: 4 };

function renderProgress() {
  const step = STEP[state.screen];
  progress.innerHTML = Array.from({ length: 4 }, (_, i) =>
    `<span class="progress__seg ${i < step ? 'is-on' : ''}"></span>`).join('');
  progress.setAttribute('aria-valuenow', String(step));
}

function render() {
  // Guard: the details screen cannot render without a country. Reachable via a
  // hand-edited deep link, so fail back rather than throwing.
  if (state.screen === 'details' && !state.country) state.screen = 'country';

  app.innerHTML = SCREENS[state.screen]();
  renderProgress();
  syncDev();
  scroll.scrollTo({ top: 0, behavior: 'smooth' });
}

const escapeAttr = (s) => String(s).replace(/"/g, '&quot;');
const escapeHtml = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  if (e.target.closest('#country-trigger') || e.target.closest('#change-country')) {
    return CountryPicker.open({
      root: modalRoot,
      selected: state.country,
      title: 'Where is your bank?',
      onSelect: (c) => {
        const changed = !state.country || state.country.code !== c.code;
        state.country = c;
        state.countryErr = false;
        // A different country means a different field set — keeping values keyed
        // to the old schema would silently carry an IBAN into a CLABE form.
        if (changed) {
          state.values = {};
          state.errors = {};
          state.submitted = false;
        }
        render();
      },
    });
  }

  const jump = e.target.closest('[data-jump]');
  if (jump) {
    const el = document.getElementById(`f-${jump.dataset.jump}`);
    if (el) { el.focus(); el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    return;
  }

  const btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'intro-continue':
      state.screen = 'country';
      return render();
    case 'country-continue':
      if (!state.country) {
        state.countryErr = true;
        return render();
      }
      state.screen = 'details';
      return render();
    case 'country-back':
      state.screen = 'intro';
      return render();
    case 'details-back':
      state.screen = 'country';
      return render();
    case 'submit': {
      state.submitted = true;
      if (!validateAll()) {
        render();
        const first = Object.keys(state.errors)[0];
        const el = document.getElementById(`f-${first}`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return toast('Some details need attention');
      }
      state.screen = 'done';
      state.donePhase = 'checking';
      render();
      return runChecks();
    }
    case 'edit-again':
      state.screen = 'details';
      return render();
  }
});

/* Live-validate on the way out of a field, but only after a first submit —
   validating as someone types their first three IBAN characters is just nagging. */
app.addEventListener('input', (e) => {
  const key = e.target.dataset && e.target.dataset.field;
  if (!key) return;
  state.values[key] = e.target.value;

  if (!state.submitted) return;
  const f = schema().fields.find((x) => x.key === key);
  const msg = validateField(f, e.target.value);
  const had = state.errors[key];
  if (msg) state.errors[key] = msg; else delete state.errors[key];
  // Only re-render when the error state actually flips, so the caret is not
  // yanked out of the input on every keystroke.
  if (!!msg !== !!had) {
    const pos = e.target.selectionStart;
    render();
    const again = document.getElementById(`f-${key}`);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  }
});

app.addEventListener('change', (e) => {
  const key = e.target.dataset && e.target.dataset.field;
  if (key && e.target.tagName === 'SELECT') {
    state.values[key] = e.target.value;
    if (state.submitted) validateAll();
    render();
  }
});

/* -------------------------------------------------------------- dev tools */

const dev = document.querySelector('.dev');

(function fillDevCountries() {
  const sel = dev.querySelector('#dev-country');
  sel.innerHTML = window.COUNTRIES.map((c) => {
    const verified = !!window.WIRE_RECEIVE[c.code];
    return `<option value="${c.code}">${verified ? '● ' : '○ '}${c.name}</option>`;
  }).join('');
  sel.value = state.country ? state.country.code : 'DE';
})();

/* Valid sample data per field type, so the form can be filled in one click when
   demoing the success path. Keyed off the schema's own placeholders where they
   are already valid examples. */
function prefill() {
  const s = schema();
  if (!s) return;
  s.fields.forEach((f) => {
    if (f.type === 'select') { state.values[f.key] = f.options[0]; return; }
    const p = (f.placeholder || '').trim();
    // A placeholder is only safe to use if it actually passes validation.
    state.values[f.key] = p && !validateField(f, p) ? p : sampleFor(f);
  });
  state.errors = {};
}

function sampleFor(f) {
  if (f.key === 'name') return 'Whitfield Family Office, LLC';
  if (f.key === 'street') return '1200 Brickell Avenue, Suite 1800';
  if (f.key === 'city') return 'Miami';
  if (f.type === 'tel') return '+1 305 555 0142';
  if (!f.pattern) return 'Sample value';
  // Derive a passing string from the pattern's own length hints.
  const m = f.pattern.match(/\{(\d+)(?:,(\d+))?\}/);
  const n = m ? Number(m[1]) : 8;
  return /A-Za-z/.test(f.pattern) ? 'ABCD'.repeat(n).slice(0, n) : '1'.repeat(n);
}

dev.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-goto]');
  if (nav) {
    const to = nav.dataset.goto;
    if ((to === 'details' || to === 'done') && !state.country) {
      state.country = window.countryByCode(dev.querySelector('#dev-country').value);
    }
    state.screen = to;
    state.submitted = false;
    state.errors = {};
    modalRoot.innerHTML = '';
    if (to === 'done') {
      // The success screen is meaningless with an empty summary.
      if (!Object.keys(state.values).length) prefill();
      state.donePhase = 'checking';
      render();
      return runChecks();
    }
    return render();
  }

  const done = e.target.closest('[data-done]');
  if (done) {
    state.screen = 'done';
    state.donePhase = done.dataset.done;
    if (!state.country) state.country = window.countryByCode(dev.querySelector('#dev-country').value);
    if (!Object.keys(state.values).length) prefill();
    if (state.donePhase === 'checking') { render(); return runChecks(); }
    checkTimers.forEach(clearTimeout);
    return render();
  }

  if (e.target.closest('#dev-reset')) {
    checkTimers.forEach(clearTimeout);
    Object.assign(state, {
      screen: 'intro', country: null, countryErr: false,
      values: {}, errors: {}, submitted: false,
      donePhase: 'checking', checked: {}, usLabels: true, hints: true,
    });
    dev.querySelector('#dev-country').value = 'DE';
    dev.querySelector('#dev-prefill').checked = false;
    modalRoot.innerHTML = '';
    return render();
  }
});

dev.addEventListener('change', (e) => {
  if (e.target.id === 'dev-country') {
    state.country = window.countryByCode(e.target.value);
    state.countryErr = false;
    state.values = {};
    state.errors = {};
    state.submitted = false;
    if (dev.querySelector('#dev-prefill').checked) prefill();
    return render();
  }
  if (e.target.id === 'dev-uslabels') { state.usLabels = e.target.checked; return render(); }
  if (e.target.id === 'dev-hints') { state.hints = e.target.checked; return render(); }
  if (e.target.id === 'dev-prefill') {
    if (e.target.checked) prefill();
    else { state.values = {}; state.errors = {}; state.submitted = false; }
    return render();
  }
});

function syncDev() {
  dev.querySelectorAll('[data-goto]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.goto === state.screen));
  dev.querySelectorAll('[data-done]').forEach((b) =>
    b.classList.toggle('is-on', state.screen === 'done' && b.dataset.done === state.donePhase));
  dev.querySelector('#dev-uslabels').checked = state.usLabels;
  dev.querySelector('#dev-hints').checked = state.hints;
  if (state.country) dev.querySelector('#dev-country').value = state.country.code;

  // Say plainly whether the selected country has verified requirements or falls
  // back to the generic form — otherwise the fallback looks like a bug.
  const note = dev.querySelector('#dev-schema-note');
  if (state.country) {
    const s = window.receiveSchema(state.country.code);
    note.textContent = s.generic
      ? '○ No verified schema — generic fallback form'
      : `● ${s.fields.filter((f) => f.req === 'required').length} required fields · `
        + `${s.usesIban ? 'IBAN' : 'no IBAN'} · ${s.currency}`;
  } else {
    note.textContent = '';
  }
}

/* ------------------------------------------------------------------ toast */

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1900);
}

/* ------------------------------------------------------------------- boot */

render();

/* A ?screen=done deep link renders the verifying phase, so it also has to start
   the animation — otherwise the spinners never resolve. Prefill too, since an
   empty read-back summary would make the success screen look broken. */
if (state.screen === 'done') {
  if (!Object.keys(state.values).length) { prefill(); render(); }
  if (state.donePhase === 'checking') runChecks();
}
