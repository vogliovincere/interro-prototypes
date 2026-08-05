/* =============================================================================
   Interro — Settlement Account Details (mobile widget prototype)

   Four screens inside the same 390px frame as the other two flows:
     1. "intro"    — what this is and why it is being asked
     2. "accounts" — the repeatable account editor. Two steps on ONE page.
     3. "review"   — everything read back before it becomes a standing record
     4. "done"     — submitted, awaiting approval

   SCOPE: ACCOUNT DETAILS ONLY. An earlier draft opened with a screen collecting
   the entity — legal name, party type, manager, registered address, country,
   operations contact. It is gone deliberately. This is a component that does one
   thing: collect the account coordinates money can be sent to. Everything about
   WHO the party is belongs to the entity master and the KYC flow, and a widget
   that re-collects it is a worse widget and a worse integration.

   That also matches what the real forms surround their wire block with — MEI,
   LEI, GIIN, CRN, EIN, tax residence, UK treaty passport, signature-block
   drafting, five categories of contact, a W-8/W-9 decision tree. None of it
   affects where a wire goes. Consume a resolved party; do not re-ask.

   HOW THIS DIFFERS FROM THE OTHER TWO WIDGETS, which is the reason it exists.

   The capital-call widget collects nothing and displays instructions. The
   distribution widget collects one account, for one distribution that has
   already been declared. Both are anchored to a payment.

   Private credit onboarding is not. Settlement details are published as a
   STANDING RECORD, before any particular payment exists, and that record holds
   SEVERAL accounts — because the same party settles cash and securities in
   different places and may hold a different account per currency. So:

     • No payment context. The flow is initiated by onboarding, not by a wire.
       It alludes to what the details will be used for without pretending a
       specific payment is pending.
     • Accounts are a LIST, not a form. Many tagged accounts.
     • Bank country is per ACCOUNT — a USD collection account in New York
       alongside a EUR account in Frankfurt is entirely ordinary.
     • Two levels. DDA then FFC. See the long note in adf.js; the short version
       is that getting level 2 wrong means the wire arrives and is never
       credited, which is worse than a rejection because nobody gets an error.

   Per-country field sets come from ../shared/wireReceive.js, filtered to the
   account-level fields by adfAccountFields() — which also drops the US
   checking-or-savings select, since a wire does not route on deposit type.
   Validation is format-only, for the same reason as the other flows: Interro
   cannot confirm from a form that an account exists, but it can stop a
   20-character Swiss IBAN.

   Sourcing for every design decision: research.html, alongside this file.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------- demo data */

/* The requesting institution, and nothing else.

   There was a DEAL object here — borrower, facility, CUSIP, closing date — and a
   card on screen 1 that displayed it. It is gone deliberately. Settlement
   accounts are a PARTY-level record: the same account details serve every
   facility that party is in, and the whole point of collecting them once is that
   they are not re-collected per loan. Naming a facility on the intro implied the
   opposite, that this submission belonged to one CUSIP, which is the model this
   flow is meant to replace. Nothing in the flow is facility-scoped now. */
const ORG = { agent: 'Interro Agency Services' };

/* ---------------------------------------------------------------- app state */

const blankDraft = () => ({
  purpose: 'collection',
  otherLabel: '',
  currency: 'USD',
  structure: 'omnibus',
  country: window.countryByCode('US'),
  accountName: '',
  ffcName: '',
  ffcNumber: '',
  special: '',
  values: {},          // wireReceive field key → string
});

const state = {
  screen: 'intro',       // 'intro' | 'accounts' | 'review' | 'done'

  accounts: [],          // committed accounts
  draft: blankDraft(),   // the one being edited
  editIndex: null,       // index in `accounts` when editing, else null
  substep: 'details',    // 'details' | 'another'  — the two steps on one page
  acctErrors: {},
  acctSubmitted: false,

  donePhase: 'checker',  // 'checker' | 'callback' | 'published'

  twoLevel: true,        // dev tools
  ffcBuild: true,        // dev tools
  usLabels: true,        // dev tools
  hints: true,           // dev tools
};

const app = document.getElementById('app');
const scroll = document.getElementById('scroll');
const progress = document.getElementById('progress');
const modalRoot = document.getElementById('modal-root');

/* Deep links, so a state can be opened or screenshotted directly:
     ?screen=accounts&country=DE
     ?seed=clo                → the worked CLO example, on review
     ?twolevel=0              → the naive single-level form, for comparison */
(function readUrl() {
  const q = new URLSearchParams(location.search);

  if (q.get('twolevel') === '0') state.twoLevel = false;
  if (q.get('us') === '0') state.usLabels = false;
  if (q.get('hints') === '0') state.hints = false;

  const cc = (q.get('country') || '').toUpperCase();
  if (cc) {
    const c = window.countryByCode(cc);
    if (c) {
      state.draft.country = c;
      // Follow the schema's currency too, or a ?country=DE deep link opens a
      // German account defaulting to USD, which reads as a bug in a demo.
      state.draft.currency = window.adfAccountFields(c.code).currency || state.draft.currency;
    }
  }

  const st = q.get('structure');
  if (st === 'dedicated' || st === 'omnibus') state.draft.structure = st;

  if (q.get('seed') === 'clo') seedCloExample();

  const s = q.get('screen');
  if (['accounts', 'review', 'done'].includes(s)) state.screen = s;

  // `step` is what history navigation writes for the second half of the accounts
  // page, so it has to be read back or a copied URL lands on the wrong step.
  if (q.get('step') === 'another') state.substep = 'another';

  const d = q.get('done');
  if (['checker', 'callback', 'published'].includes(d)) state.donePhase = d;
})();

/* The dev panel is opt-in: ?dev=1 reveals it, anything else gets the widget on
   its own with every toggle at its default. Hidden is the CSS default, so the
   clean link can never flash the panel before this runs. */
if (new URLSearchParams(location.search).get('dev') === '1') {
  document.documentElement.classList.add('devmode');
}

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
  layers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="m12 3 9 5-9 5-9-5 9-5z"/><path d="m3 13 9 5 9-5"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
           stroke-linecap="round" aria-hidden="true">
           <path d="M12 5v14"/><path d="M5 12h14"/></svg>`,
};

const escapeAttr = (s) => String(s == null ? '' : s).replace(/"/g, '&quot;');
const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ============================================================== screen 1 === */

/* THREE BLOCKS, IN READING ORDER. The wide layout composes them into two columns
   with CSS grid — statement on the left, what-happens panel on the right, action
   at the foot of the left column. The markup order is the MOBILE order, so below
   900px the blocks just stack the way they always did: heading, lede, steps,
   note, button, fine print. No `order` juggling, no duplicated content.

   An earlier version of this screen was one centred stack of five same-weight
   blocks in a 980px frame. It left a wide band of empty white and read as a
   mobile screen that had been stretched. A frame this shape has two axes; the
   fix was to use the second one.

   The originnote class stays on both notes so the mobile rendering is unchanged;
   at width the stylesheet neutralises the boxes, because inside a bordered panel
   a second bordered box is noise. */
function screenIntro() {
  return `
    <div class="introlead">
      <h1>Add your settlement accounts</h1>
      <p class="intro__lede">
        ${ORG.agent} needs the accounts to pay you on. You are doing this
        <strong>once</strong>. These become the standing record every future
        payment to you settles against.
      </p>
    </div>

    <aside class="intropanel">
      <p class="intropanel__label">What happens</p>

      <ol class="steps">
        <li><strong>Your accounts</strong>As many as you settle through. Tag each
          one so payments land in the right place.</li>
        <li><strong>Review and submit</strong>Everything read back to you before
          anything is sent.</li>
        <li><strong>Approval</strong>A second approver checks the details, then
          they become your standing record.</li>
      </ol>

      <div class="originnote intropanel__note">
        ${ICON.layers}
        <p>
          Most parties have <strong>more than one account</strong> — a collection
          account for cash and a custody account for securities is the common
          case. Add as many as you need.
        </p>
      </div>
    </aside>

    <!-- A third note sat here saying "Account details only. Nothing here asks
         about your entity, your tax status or your KYC." Cut: three stacked
         callouts on one screen is one more than the screen can carry, and this
         one described what the form does NOT do. The absence of entity questions
         is self-evident from the form itself. -->

    <div class="introact">
      <div class="actions">
        <button class="btn btn--primary" id="intro-continue">Get started →</button>
      </div>
      <div class="originnote finenote">
        ${ICON.lock}
        <p>
          These details are used to send money <em>to</em> you. Nothing is charged
          and no payment is initiated by this form.
        </p>
      </div>
    </div>`;
}

/* ============================================================== screen 2 === */

const acctSchema = () => window.adfAccountFields(state.draft.country.code);

/* The account's OWN fields — the ones no country schema supplies, because they
   describe the account's role rather than its bank. */
function ownFields() {
  const d = state.draft;
  const twoLevel = state.twoLevel && d.structure === 'omnibus';

  const l1 = {
    key: 'accountName',
    label: twoLevel ? 'Account name at the bank' : 'Name on the account',
    us: twoLevel ? 'DDA account name — usually the custodian\'s' : 'Beneficiary name',
    req: 'required', type: 'text',
    placeholder: twoLevel ? 'e.g. Kingsbridge CLO VI Ltd.' : 'e.g. Meridian Credit Advisors, LP',
    hint: twoLevel
      ? 'The name on the account the wire actually lands in. On a custodian '
        + 'structure this is often not exactly your own legal name.'
      : 'Exactly as the bank has it. A missing suffix is a common cause of rejection.',
  };

  if (!twoLevel) return [l1];

  return [l1, {
    key: 'ffcName',
    label: 'FFC account name', us: 'For further credit to',
    req: 'required', type: 'text',
    placeholder: 'e.g. Kingsbridge CLO VI Ltd / Collection Account',
    hint: 'The sub-account the money is applied on to. Convention is the account '
      + 'holder\'s name, then the account\'s purpose.',
  }, {
    key: 'ffcNumber',
    label: 'FFC account number', us: 'Sub-account number',
    req: 'required', type: 'code',
    placeholder: '220417',
    pattern: '^[A-Za-z0-9-]{3,20}$',
    invalid: 'Between 3 and 20 letters, digits or dashes.',
    hint: 'Without this the wire arrives at the custodian and is never applied to you.',
  }];
}

function purposeChoices() {
  return `
    <div class="choices choices--stacked" id="purpose-choices">
      ${window.ADF_PURPOSES.map((p) => `
        <button type="button" class="choice" data-purpose="${p.key}"
                aria-pressed="${state.draft.purpose === p.key}">
          <span class="choice__radio"></span>
          <span class="choice__text">
            <span class="choice__title">${p.label}</span>
            <span class="choice__sub">${p.sub}</span>
          </span>
        </button>`).join('')}
    </div>`;
}

function structureChoices() {
  return `
    <div class="choices choices--stacked" id="structure-choices">
      ${window.ADF_STRUCTURES.map((s) => `
        <button type="button" class="choice" data-structure="${s.key}"
                aria-pressed="${state.draft.structure === s.key}">
          <span class="choice__radio"></span>
          <span class="choice__text">
            <span class="choice__title">${s.label}</span>
            <span class="choice__sub">${s.sub}</span>
          </span>
        </button>`).join('')}
    </div>`;
}

/* REMOVED: the reference-line preview.

   This screen used to show the assembled LSTA/LMA standard reference line under a
   heading reading "Reference line every payment will carry", with a note saying
   Interro fills it in. It was cut after review, and for a good reason: the flow
   collects standing details and moves no money, so a block describing what a
   payment will carry read as though something were being processed now. "Interro
   fills this in" made that worse, since in the demo the payer is Interro Agency
   Services while in the product Interro is the platform and the payer is the agent.

   The underlying finding still stands and still shapes the model — payment purpose
   belongs in the reference line rather than in a separate account, which is why
   there is no principal-versus-interest split here. See research.html section 2.3.
   If the format is ever worth showing again, it belongs next to a payment, not next
   to the account being registered. */

function screenAccounts() {
  return state.substep === 'another' ? substepAnother() : substepDetails();
}

/* ---- step 1 of 2 on this page: the account itself ---- */
function substepDetails() {
  const d = state.draft;
  const s = acctSchema();
  const isEdit = state.editIndex !== null;
  const twoLevel = state.twoLevel && d.structure === 'omnibus';
  const fields = ownFields();
  const errKeys = state.acctSubmitted ? Object.keys(state.acctErrors) : [];
  const allFields = fields.concat(s.fields);

  return `
    ${stepHeader(1)}

    <h1>${isEdit ? 'Edit this account'
         : state.accounts.length ? `Account ${state.accounts.length + 1}`
         : 'Your first account'}</h1>

    ${state.accounts.length && !isEdit ? committedList(true) : ''}

    ${errKeys.length ? errSummary(errKeys, state.acctErrors, allFields) : ''}

    ${state.twoLevel ? `
      <section class="fsection">
        <p class="fsection__title">What is this account for?</p>
        <p class="fsection__sub">
          The tag travels with the account, so ops never has to read a purpose out
          of an account name.
        </p>
        ${purposeChoices()}
        ${d.purpose === 'other' ? `
          <div class="fgroup">
            <label class="flabel" for="f-otherLabel">Name this account
              <span class="req">*</span></label>
            <input type="text" class="finput ${state.acctSubmitted && state.acctErrors.otherLabel ? 'is-error' : ''}"
                   id="f-otherLabel" data-own="otherLabel"
                   value="${escapeAttr(d.otherLabel)}"
                   placeholder="e.g. Expense reimbursement account"
                   autocomplete="off" />
            ${state.acctSubmitted && state.acctErrors.otherLabel
              ? `<p class="ferror">${state.acctErrors.otherLabel}</p>` : ''}
          </div>` : ''}
      </section>

      <section class="fsection">
        <p class="fsection__title">How is the account held?</p>
        <p class="fsection__sub">
          This decides whether we need one account number or two. It is the thing
          most often filled in wrongly on paper.
        </p>
        ${structureChoices()}
      </section>` : ''}

    <section class="fsection">
      <p class="fsection__title">Where is the account?</p>

      <div class="fgrid">
        <div class="fgroup fgroup--narrow">
          <label class="flabel" for="acct-country-trigger">
            Country of the bank <span class="req">*</span>
          </label>
          ${CountryPicker.trigger({
            selected: d.country,
            placeholder: 'Select country',
            id: 'acct-country-trigger',
          })}
          ${state.hints ? `
            <p class="fhelp">
              Asked per account, not once — the fields below change with it. An
              account in ${d.country.name} needs
              ${s.usesIban ? 'an IBAN' : 'a national routing code, not an IBAN'}.
            </p>` : ''}
        </div>

        <div class="fgroup fgroup--narrow">
          <label class="flabel" for="f-currency">Currency <span class="req">*</span></label>
          <select class="finput" id="f-currency" data-own="currency">
            ${window.ADF_CURRENCIES.map((c) =>
              `<option value="${c}" ${d.currency === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          ${state.hints ? `
            <p class="fhelp">
              One account per currency. If you settle ${d.currency} and something else
              through different accounts, add both.
            </p>` : ''}
        </div>
      </div>
    </section>

    ${s.gotcha ? `
      <div class="gotcha">
        ${ICON.warn}
        <p>${s.gotcha}</p>
      </div>` : ''}

    <section class="fsection">
      <p class="fsection__title">
        ${twoLevel ? 'Level 1 — the account the wire lands in' : 'The account'}
      </p>
      ${twoLevel ? `
        <p class="fsection__sub">
          The custodian's own account at the bank. This is what the routing number
          reaches.
        </p>` : ''}
      <div class="fgrid">
        ${[fields[0]].concat(s.fields).map((f) =>
          fieldHtml(f, ownOrValue(f.key), state.acctErrors[f.key], state.acctSubmitted)).join('')}
      </div>
    </section>

    ${twoLevel ? `
      <section class="fsection fsection--l2">
        <p class="fsection__title">Level 2 — your sub-account</p>
        <p class="fsection__sub">
          “For further credit”. Without it the wire reaches the custodian and stops
          there — credited to nobody, with no error raised.
        </p>
        <div class="fgrid">
          ${fields.slice(1).map((f) =>
            fieldHtml(f, ownOrValue(f.key), state.acctErrors[f.key], state.acctSubmitted)).join('')}
        </div>
        ${state.ffcBuild && d.purpose !== 'other' && d.accountName.trim() ? `
          <button type="button" class="ffcbuild" id="ffc-build">
            Use “${escapeHtml(suggestedFfcName())}”
          </button>` : ''}
      </section>` : ''}

    <div class="fgroup">
      <label class="flabel" for="f-special">Special instructions</label>
      <input type="text" class="finput" id="f-special" data-own="special"
             value="${escapeAttr(d.special)}"
             placeholder="Anything a payment on this account must carry"
             autocomplete="off" />
      ${state.hints
        ? '<p class="fhelp">Optional. Free text, passed through to the payment.</p>'
        : ''}
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="acct-save">
        ${isEdit ? 'Save this account' : 'Save account →'}
      </button>
      <button class="btn btn--quiet" id="acct-cancel">
        ${isEdit ? 'Cancel' : state.accounts.length ? '← Back to review' : '← Back'}
      </button>
    </div>`;
}

/* ---- step 2 of 2 on this page: is there another one? ----
   Explicitly a second step on the SAME screen rather than a new screen: the
   answer is almost always "no", and a whole screen transition to say so is a
   worse experience than a question that appears where the work just finished. */
function substepAnother() {
  const last = state.accounts[state.accounts.length - 1];

  return `
    ${stepHeader(2)}

    <div class="savedok">
      <span class="savedok__tick">${ICON.check}</span>
      <div>
        <p class="savedok__title">${escapeHtml(acctTitle(last))} saved</p>
        <p class="savedok__sub">${escapeHtml(acctLine(last))}</p>
      </div>
    </div>

    <h1>Any other accounts?</h1>

    <p class="intro__lede">
      Add one for every account you settle through. Most parties have two — cash
      in one place, securities in another.
    </p>

    ${committedList(false)}

    <div class="choices choices--stacked">
      <button type="button" class="choice choice--action" id="add-another">
        <span class="choice__icon">${ICON.plus}</span>
        <span class="choice__text">
          <span class="choice__title">Yes, add another account</span>
          <span class="choice__sub">A different purpose, currency or bank</span>
        </span>
      </button>
      <button type="button" class="choice choice--action" id="no-more">
        <span class="choice__icon">${ICON.check}</span>
        <span class="choice__text">
          <span class="choice__title">No, that's all of them</span>
          <span class="choice__sub">Go to review</span>
        </span>
      </button>
    </div>`;
}

function stepHeader(n) {
  const labels = ['Account details', 'Add another?'];
  return `
    <div class="substeps" aria-label="Step ${n} of 2">
      ${labels.map((l, i) => `
        <span class="substep ${i + 1 === n ? 'is-on' : ''} ${i + 1 < n ? 'is-done' : ''}">
          <span class="substep__n">${i + 1}</span>${l}
        </span>`).join('')}
    </div>`;
}

/* --------------------------------------------------------- account helpers */

const OWN_KEYS = new Set(['accountName', 'ffcName', 'ffcNumber', 'special',
  'otherLabel', 'currency']);

const ownOrValue = (key) =>
  OWN_KEYS.has(key) ? state.draft[key] : (state.draft.values[key] || '');

function setDraftValue(key, val) {
  if (OWN_KEYS.has(key)) state.draft[key] = val;
  else state.draft.values[key] = val;
}

/* Builds the FFC name from the LEVEL 1 account name rather than from a party
   record — there is no party record any more, and on a custodian structure the
   level-1 name is the account holder's name anyway, which is exactly what the
   convention wants in front of the purpose. */
function suggestedFfcName() {
  const p = window.adfPurpose(state.draft.purpose);
  return `${state.draft.accountName.trim()} / ${p.ffcHint}`;
}

function acctTitle(a) {
  const p = window.adfPurpose(a.purpose);
  return a.purpose === 'other' && a.otherLabel ? a.otherLabel : p.label;
}

function acctLine(a) {
  const acctNo = a.structure === 'omnibus' && state.twoLevel
    ? a.ffcNumber
    : (a.values.account || a.values.iban || a.values.ibanOrAccount || '');
  const bank = a.values.bankName || a.country.name;
  return `${a.currency} · ${bank}${acctNo ? ` · ${maskTail(acctNo)}` : ''}`;
}

/* Read-back convention: last four characters only. An account number echoed in
   full on a summary screen is an account number in a screenshot. */
function maskTail(v) {
  const s = String(v).replace(/\s+/g, '');
  return s.length <= 4 ? s : `···${s.slice(-4)}`;
}

function committedList(compact) {
  if (!state.accounts.length) return '';
  return `
    <div class="acctlist ${compact ? 'acctlist--compact' : ''}">
      ${compact ? '<p class="acctlist__title">Already added</p>' : ''}
      ${state.accounts.map((a, i) => `
        <div class="acctcard">
          <div class="acctcard__top">
            <span class="accttag accttag--${a.purpose}">${escapeHtml(acctTitle(a))}</span>
            ${a.structure === 'omnibus' && state.twoLevel
              ? '<span class="accttag accttag--levels">2-level</span>' : ''}
            ${compact ? '' : `<button class="acctcard__edit" data-edit="${i}">Edit</button>`}
          </div>
          <p class="acctcard__line">${escapeHtml(acctLine(a))}</p>
          ${compact ? '' : `
            <div class="acctcard__rows">
              ${acctRows(a).map((r) => `
                <div class="miniRow">
                  <span class="miniRow__k">${escapeHtml(r[0])}</span>
                  <span class="miniRow__v ${r[2] ? 'mono' : ''}">${escapeHtml(r[1])}</span>
                </div>`).join('')}
            </div>
            <button class="acctcard__remove" data-remove="${i}">Remove this account</button>`}
        </div>`).join('')}
    </div>`;
}

/* The read-back rows for one account, in the order a settlement person reads
   them: who the bank is, how it is reached, then the two account levels. */
function acctRows(a) {
  const s = window.adfAccountFields(a.country.code);
  const rows = [['Bank country', a.country.name, false], ['Currency', a.currency, false]];

  s.fields.forEach((f) => {
    const v = (a.values[f.key] || '').trim();
    if (!v) return;
    const mono = f.type === 'iban' || f.type === 'bic' || f.type === 'code';
    rows.push([f.label, f.key === 'account' ? maskTail(v) : v, mono]);
  });

  const twoLevel = state.twoLevel && a.structure === 'omnibus';
  rows.push([twoLevel ? 'DDA account name' : 'Name on the account', a.accountName, false]);
  if (twoLevel) {
    rows.push(['FFC account name', a.ffcName, false]);
    rows.push(['FFC account number', maskTail(a.ffcNumber), true]);
  }
  if (a.special.trim()) rows.push(['Special instructions', a.special, false]);
  return rows;
}

/* -------------------------------------------------------------- validation */

/* Hyphens are stripped alongside spaces before testing. The completed CLO form
   writes its DDA number with a dash in it, and someone transcribing from a PDF
   will type the dash — rejecting that would be the form being wrong, not the
   user. */
function validateField(f, raw) {
  const v = String(raw || '').replace(/[\s-]+/g, '');
  if (!v) return f.req === 'required' ? `${f.label} is required.` : null;
  if (f.pattern && !new RegExp(f.pattern).test(v)) {
    return f.invalid || `${f.label} doesn't look right.`;
  }
  return null;
}

function validateAccount() {
  const errors = {};
  ownFields().concat(acctSchema().fields).forEach((f) => {
    const msg = validateField(f, ownOrValue(f.key));
    if (msg) errors[f.key] = msg;
  });
  if (state.twoLevel && state.draft.purpose === 'other' && !state.draft.otherLabel.trim()) {
    errors.otherLabel = 'Give this account a name.';
  }
  state.acctErrors = errors;
  return !Object.keys(errors).length;
}

/* ============================================================== screen 3 === */

function screenReview() {
  const n = state.accounts.length;
  return `
    <h1>Review before submitting</h1>

    <p class="intro__lede">
      These become your standing settlement record. Changing them later needs
      approval, so they are worth a read now.
    </p>

    <p class="reviewhead">${n} account${n === 1 ? '' : 's'}</p>

    ${n ? committedList(false)
      : `<div class="gotcha">
           ${ICON.warn}
           <p>No accounts added yet. At least one is needed before you can submit.</p>
         </div>`}

    <button class="btn btn--ghost" id="add-more">+ Add another account</button>

    <div class="originnote">
      ${ICON.lock}
      <p>
        Submitting sends these for approval inside ${ORG.agent}. You will get a
        copy, and you will be told before they are used for the first payment.
      </p>
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="submit" ${n ? '' : 'disabled'}>
        Submit account details →
      </button>
      <button class="btn btn--quiet" id="review-back">← Back</button>
    </div>`;
}

/* ============================================================== screen 4 === */

/* Three endings, because which one Interro ships is a policy question this
   prototype is meant to surface rather than answer.

   S&P Global's ADFlow brochure states the market is deliberately moving OFF
   phone callbacks — "institutions have been able to move away from laborious and
   outdated call-back requirements for SSIs", and "Remove Call-Backs" is a named
   benefit — replacing them with a maker/checker approval and version history.
   'checker' is therefore the default and 'callback' is shown for comparison. */
function screenDone() {
  const n = state.accounts.length;
  const many = `${n} account${n === 1 ? '' : 's'}`;

  if (state.donePhase === 'published') {
    return `
      <div class="terminal">
        <div class="terminal__icon">${ICON.check}</div>
        <h1 class="terminal__heading">Published</h1>
        <p class="terminal__sub">
          Your settlement details are live. ${many} on record, version 1.
        </p>
        ${committedList(false)}
        <div class="actions">
          <button class="btn btn--ghost" id="edit-again">Request a change</button>
        </div>
      </div>`;
  }

  if (state.donePhase === 'callback') {
    return `
      <div class="terminal">
        <div class="terminal__icon terminal__icon--wait">${ICON.info}</div>
        <h1 class="terminal__heading">We need to call you</h1>
        <p class="terminal__sub">
          Before these accounts can be used, ${ORG.agent} will call your operations
          contact on a number already on file to read them back.
        </p>
        <section class="card statuscard">
          <div class="statusrow is-done">
            <span class="statusrow__tick">${ICON.check}</span>
            <div><p class="statusrow__t">${many} received</p></div>
          </div>
          <div class="statusrow">
            <span class="spinner"></span>
            <div>
              <p class="statusrow__t">Callback to your operations contact</p>
              <p class="statusrow__s">Usually within one business day</p>
            </div>
          </div>
          <div class="statusrow is-pending">
            <span class="statusrow__dot"></span>
            <div><p class="statusrow__t">Details go live</p></div>
          </div>
        </section>
        <div class="originnote">
          ${ICON.warn}
          <p>
            The industry is moving away from this. S&amp;P Global's ADFlow lists
            <em>“remove call-backs”</em> as a benefit of a maker/checker workflow —
            worth deciding which model Interro adopts.
          </p>
        </div>
        <div class="actions">
          <button class="btn btn--ghost" id="edit-again">Change these details</button>
        </div>
      </div>`;
  }

  return `
    <div class="terminal">
      <div class="terminal__icon">${ICON.check}</div>
      <h1 class="terminal__heading">Submitted for approval</h1>
      <p class="terminal__sub">
        ${many} received. Two people at ${ORG.agent} review settlement details
        before they can be used — nobody needs to call you.
      </p>

      <section class="card statuscard">
        <div class="statusrow is-done">
          <span class="statusrow__tick">${ICON.check}</span>
          <div>
            <p class="statusrow__t">Submitted by you</p>
            <p class="statusrow__s">Version 1 · recorded and timestamped</p>
          </div>
        </div>
        <div class="statusrow">
          <span class="spinner"></span>
          <div>
            <p class="statusrow__t">Checker review</p>
            <p class="statusrow__s">A second approver at ${ORG.agent}</p>
          </div>
        </div>
        <div class="statusrow is-pending">
          <span class="statusrow__dot"></span>
          <div>
            <p class="statusrow__t">Published to your standing record</p>
            <p class="statusrow__s">Usable as soon as the checker approves</p>
          </div>
        </div>
      </section>

      ${committedList(false)}

      <div class="originnote">
        ${ICON.lock}
        <p>
          Every future change is versioned against this one, so a counterparty can
          always see what changed and when.
        </p>
      </div>

      <div class="actions">
        <button class="btn btn--ghost" id="edit-again">Change these details</button>
      </div>
    </div>`;
}

/* ---------------------------------------------------------- shared field UI */

function fieldHtml(f, value, err, submitted) {
  const v = value || '';
  const showErr = submitted ? err : null;
  const ok = !showErr && String(v).trim() && !validateField(f, v);
  const id = `f-${f.key}`;
  const attr = OWN_KEYS.has(f.key) ? 'data-own' : 'data-field';

  const chip = f.req === 'conditional'
    ? '<span class="reqchip reqchip--conditional">If you have one</span>'
    : f.req === 'optional'
      ? '<span class="reqchip reqchip--optional">Optional</span>'
      : '<span class="req">*</span>';

  /* Width hint for the desktop grid. Identifiers and pickers are short and fixed
     in length, so two fit comfortably on a row; names and addresses are free text
     of unpredictable length and get the full width. Ignored entirely on narrow
     screens, where everything is one column. */
  const span = f.type === 'text' ? 'fgroup--wide' : 'fgroup--narrow';

  const control = f.type === 'select'
    ? `<select class="finput ${showErr ? 'is-error' : ''}" id="${id}" ${attr}="${f.key}">
         <option value="">Select…</option>
         ${f.options.map((o) =>
           `<option value="${escapeAttr(o)}" ${v === o ? 'selected' : ''}>${escapeHtml(o)}</option>`
         ).join('')}
       </select>`
    : `<input type="text"
              class="finput ${f.type === 'iban' || f.type === 'bic' || f.type === 'code' ? 'mono' : ''}
                     ${showErr ? 'is-error' : ''} ${ok ? 'is-ok' : ''}"
              id="${id}" ${attr}="${f.key}"
              value="${escapeAttr(v)}"
              placeholder="${escapeAttr(f.placeholder || '')}"
              autocomplete="off" spellcheck="false" />`;

  return `
    <div class="fgroup ${span}" id="g-${f.key}">
      <label class="flabel" for="${id}">
        ${f.label}${chip}
        ${state.usLabels && f.us ? `<span class="flabel__us">${f.us}</span>` : ''}
      </label>
      ${control}
      ${ok && f.type !== 'select' ? `<span class="fok">${ICON.check}</span>` : ''}
      ${showErr ? `<p class="ferror">${showErr}</p>`
        : (state.hints && f.hint ? `<p class="fhelp">${f.hint}</p>` : '')}
    </div>`;
}

function errSummary(keys, errors, fields) {
  return `
    <div class="errsum">
      <p class="errsum__title">${keys.length} field${keys.length === 1 ? '' : 's'} need attention</p>
      <ul>
        ${keys.map((k) => {
          const f = fields.find((x) => x.key === k);
          return `<li><button data-jump="${k}">${f ? f.label : k}</button> — ${errors[k]}</li>`;
        }).join('')}
      </ul>
    </div>`;
}

/* ---------------------------------------------------------------- plumbing */

const SCREENS = {
  intro: screenIntro,
  accounts: screenAccounts,
  review: screenReview,
  done: screenDone,
};

const STEP = { intro: 1, accounts: 2, review: 3, done: 4 };

function renderProgress() {
  const step = STEP[state.screen];
  progress.innerHTML = Array.from({ length: 4 }, (_, i) =>
    `<span class="progress__seg ${i < step ? 'is-on' : ''}"></span>`).join('');
  progress.setAttribute('aria-valuenow', String(step));
}

/* Which view was on screen at the end of the last render, so the next one can
   tell navigation apart from a re-render. */
let lastView = null;

/* ---------------------------------------------------------------- history ---

   The browser back button has to work. Without this the widget is a single
   document that never changes URL, so back leaves the prototype entirely — which
   in an embedded context means navigating the host page away, and in a demo means
   losing the whole flow because someone reached for the obvious control.

   Each view change pushes an entry, so back and forward walk the screens. The URL
   is updated to match, which means any point in the flow can also be copied out of
   the address bar and shared — the same deep links readUrl() already understands.

   Accounts already added are NOT unwound by going back. Back moves between
   screens; it is not an undo stack. Re-entering the accounts screen still shows
   everything saved, which is what someone pressing back to check a field expects.

   pushState throws on some file:// origins, so every call is guarded. The flow has
   to keep working when the folder is opened straight off disk. */

let suppressPush = false;

const historyState = () => ({
  interro: true,           // marks entries as ours, so foreign ones are ignored
  screen: state.screen,
  substep: state.substep,
  editIndex: state.editIndex,
});

function historyUrl() {
  const q = new URLSearchParams(location.search);
  q.set('screen', state.screen);
  if (state.screen === 'accounts' && state.substep === 'another') q.set('step', 'another');
  else q.delete('step');
  return `${location.pathname}?${q.toString()}`;
}

function syncHistory(isFirst) {
  try {
    if (isFirst) history.replaceState(historyState(), '', historyUrl());
    else history.pushState(historyState(), '', historyUrl());
  } catch (_) {
    // file:// origins can refuse a URL change. Losing the address bar is
    // acceptable; throwing here and killing the render is not.
  }
}

window.addEventListener('popstate', (e) => {
  const s = e.state;
  if (!s || !s.interro) return;

  state.screen = s.screen;
  state.substep = s.substep;
  state.editIndex = s.editIndex;

  /* Going back INTO an edit has to reload that account into the draft, or the form
     renders against whatever the draft happened to hold. Deep-copied, so cancelling
     out of it again still cannot mutate the saved account. */
  if (s.editIndex !== null && state.accounts[s.editIndex]) {
    const a = state.accounts[s.editIndex];
    state.draft = Object.assign({}, a, { values: Object.assign({}, a.values) });
  }
  state.acctErrors = {};
  state.acctSubmitted = false;
  modalRoot.innerHTML = '';

  // Re-render for the popped entry without pushing a new one on top of it.
  suppressPush = true;
  render();
  suppressPush = false;
});

function render() {
  // Guards for hand-edited deep links: review and done are meaningless with no
  // accounts, and the "another?" step without a saved one.
  if ((state.screen === 'review' || state.screen === 'done') && !state.accounts.length) {
    state.screen = 'accounts';
    state.substep = 'details';
  }
  if (state.screen === 'accounts' && state.substep === 'another' && !state.accounts.length) {
    state.substep = 'details';
  }

  /* HOLDING THE READER'S PLACE.

     This whole file re-renders the screen from scratch on every state change, so
     picking a bank country, choosing a currency, choosing a purpose tag,
     switching the account structure and tripping a validation message all come
     through here. Scrolling to the top on all of them threw the reader back to
     the heading every time they touched a control halfway down a long form.

     The rule is about navigation, not rendering: go to the top only when the VIEW
     changes — a new screen, or the move between the two steps of the account
     page. A re-render of the same view keeps both the scroll offset AND the
     focused control, because the reader is still in the same place doing the same
     thing.

     Two details that matter:

     • WHICH element scrolls depends on the window. Above 720px the frame is a
       fixed height and .phone__scroll scrolls; below it the frame goes auto-height
       (see the media query in the capital-call sheet) and the DOCUMENT scrolls
       instead. Both are captured, because assuming the inner one silently does
       nothing on a narrow window.
     • FOCUS is restored before the scroll, with preventScroll, because focusing an
       element otherwise scrolls it into view and would undo the offset we just
       went to the trouble of keeping. */
  const view = `${state.screen}:${state.substep}:${state.editIndex}`;
  const sameView = view === lastView;

  const keepInner = scroll.scrollTop;
  const keepDoc = document.scrollingElement ? document.scrollingElement.scrollTop : 0;

  // Remember the focused control so a re-render does not drop the reader out of
  // the field they were in. Selection is only meaningful on text inputs; asking a
  // <select> for selectionStart throws in some browsers, so it is guarded.
  const active = document.activeElement;
  const focusId = sameView && active && app.contains(active) && active.id ? active.id : null;
  let selStart = null;
  let selEnd = null;
  if (focusId && active.tagName === 'INPUT') {
    try { selStart = active.selectionStart; selEnd = active.selectionEnd; } catch (_) {}
  }

  app.innerHTML = SCREENS[state.screen]();
  // Lets CSS target one screen without JS knowing anything about layout. Used by
  // the wide view to centre the short intro inside the tall embedded frame.
  app.dataset.screen = state.screen;
  renderProgress();
  syncDev();

  // A view change is a navigation, so it gets a history entry. A re-render of the
  // same view does not — otherwise every keystroke that flipped an error message
  // would need its own press of the back button to get past.
  if (!sameView && !suppressPush) syncHistory(lastView === null);

  if (sameView) {
    if (focusId) {
      const again = document.getElementById(focusId);
      if (again) {
        try { again.focus({ preventScroll: true }); } catch (_) { again.focus(); }
        if (selStart !== null) {
          try { again.setSelectionRange(selStart, selEnd); } catch (_) {}
        }
      }
    }
    scroll.scrollTop = keepInner;
    if (document.scrollingElement) document.scrollingElement.scrollTop = keepDoc;
  } else {
    scroll.scrollTo({ top: 0, behavior: 'smooth' });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  lastView = view;
}

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  if (e.target.closest('#acct-country-trigger')) {
    return CountryPicker.open({
      root: modalRoot,
      selected: state.draft.country,
      title: 'Where is this account held?',
      onSelect: (c) => {
        const changed = state.draft.country.code !== c.code;
        state.draft.country = c;
        // A different country is a different field set. Keeping values keyed to
        // the old schema would carry an IBAN into a CLABE form.
        if (changed) {
          state.draft.values = {};
          state.acctErrors = {};
          state.acctSubmitted = false;
          state.draft.currency = window.adfAccountFields(c.code).currency
            || state.draft.currency;
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

  const purpose = e.target.closest('[data-purpose]');
  if (purpose) {
    state.draft.purpose = purpose.dataset.purpose;
    return render();
  }

  const struct = e.target.closest('#structure-choices [data-structure]');
  if (struct) {
    state.draft.structure = struct.dataset.structure;
    // Dropping to one level discards the level-2 values rather than hiding them,
    // so a saved account can never carry an FFC the form no longer asked for.
    if (state.draft.structure === 'dedicated') {
      state.draft.ffcName = '';
      state.draft.ffcNumber = '';
    }
    state.acctErrors = {};
    return render();
  }

  const edit = e.target.closest('[data-edit]');
  if (edit) {
    state.editIndex = Number(edit.dataset.edit);
    // Deep-copy: editing must be cancellable, so the draft cannot alias the
    // committed account.
    const a = state.accounts[state.editIndex];
    state.draft = Object.assign({}, a, { values: Object.assign({}, a.values) });
    state.substep = 'details';
    state.acctErrors = {};
    state.acctSubmitted = false;
    state.screen = 'accounts';
    return render();
  }

  const remove = e.target.closest('[data-remove]');
  if (remove) {
    const i = Number(remove.dataset.remove);
    const label = acctTitle(state.accounts[i]);
    state.accounts.splice(i, 1);
    toast(`${label} removed`);
    return render();
  }

  const btn = e.target.closest('button');
  if (!btn) return;

  switch (btn.id) {
    case 'intro-continue':
      state.screen = 'accounts';
      state.substep = 'details';
      return render();

    case 'ffc-build':
      state.draft.ffcName = suggestedFfcName();
      delete state.acctErrors.ffcName;
      return render();

    case 'acct-save': {
      state.acctSubmitted = true;
      if (!validateAccount()) {
        render();
        const first = Object.keys(state.acctErrors)[0];
        const el = document.getElementById(`f-${first}`);
        if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return toast('Some details need attention');
      }
      const saved = state.draft;
      if (state.editIndex !== null) {
        state.accounts[state.editIndex] = saved;
        state.editIndex = null;
        state.draft = blankDraft();
        state.acctSubmitted = false;
        state.screen = 'review';
        toast('Account updated');
        return render();
      }
      state.accounts.push(saved);
      state.draft = blankDraft();
      state.acctSubmitted = false;
      state.substep = 'another';
      return render();
    }

    case 'acct-cancel':
      state.editIndex = null;
      state.draft = blankDraft();
      state.acctErrors = {};
      state.acctSubmitted = false;
      state.screen = state.accounts.length ? 'review' : 'intro';
      return render();

    case 'add-another':
    case 'add-more': {
      state.draft = blankDraft();
      state.editIndex = null;
      state.acctErrors = {};
      state.acctSubmitted = false;
      state.substep = 'details';
      state.screen = 'accounts';
      // Carry the previous account's bank forward: a second account is usually at
      // the same custodian with a different purpose, so re-typing the bank name,
      // routing number and DDA would be busywork.
      const prev = state.accounts[state.accounts.length - 1];
      if (prev) {
        state.draft.country = prev.country;
        state.draft.currency = prev.currency;
        state.draft.structure = prev.structure;
        state.draft.values = Object.assign({}, prev.values);
        state.draft.accountName = prev.accountName;
        // The tag and the sub-account are what differ, so those stay blank.
        const used = new Set(state.accounts.map((a) => a.purpose));
        const next = window.ADF_PURPOSES.find((p) => !used.has(p.key));
        if (next) state.draft.purpose = next.key;
      }
      return render();
    }

    case 'no-more':
      state.screen = 'review';
      return render();

    case 'review-back':
      state.screen = 'accounts';
      state.substep = state.accounts.length ? 'another' : 'details';
      return render();

    case 'submit':
      if (!state.accounts.length) return toast('Add at least one account');
      state.screen = 'done';
      return render();

    case 'edit-again':
      state.screen = 'review';
      return render();
  }
});

app.addEventListener('input', (e) => {
  const ds = e.target.dataset || {};
  const key = ds.own || ds.field;
  if (!key) return;
  setDraftValue(key, e.target.value);
  if (state.acctSubmitted) {
    liveRevalidate(e.target, ownFields().concat(acctSchema().fields), state.acctErrors, key);
  }
});

/* Re-render only when the error state actually FLIPS. Re-rendering on every
   keystroke would be wasteful, and the message does not change in between.

   Focus and caret restoration used to live here. It is now render()'s job for any
   same-view re-render, which covers this case and the selects as well — two
   mechanisms both trying to restore focus would only fight each other. */
function liveRevalidate(el, fields, errors, key) {
  const f = fields.find((x) => x.key === key);
  if (!f) return;
  const msg = validateField(f, el.value);
  const had = errors[key];
  if (msg) errors[key] = msg; else delete errors[key];
  if (!!msg !== !!had) render();
}

app.addEventListener('change', (e) => {
  if (e.target.tagName !== 'SELECT') return;
  const ds = e.target.dataset || {};
  const key = ds.own || ds.field;
  if (!key) return;
  setDraftValue(key, e.target.value);
  if (state.acctSubmitted) validateAccount();
  return render();
});

/* -------------------------------------------------------------- seed data */

/* Modelled on a real completed CLO admin-details form supplied by Quorim.

   THE STRUCTURE IS FAITHFUL; THE IDENTIFIERS ARE NOT, DELIBERATELY. The source
   document belongs to a live CLO and its account coordinates are live. This repo
   is mirrored to a public GitHub Pages site, and a named entity's real DDA and
   FFC numbers on the open web are the raw material for exactly the misdirected-
   payment fraud this market's callback apparatus exists to prevent. Every name
   and number below is invented; 021000021 is the placeholder routing number
   already used elsewhere in this repo.

   What IS faithful, because it is the whole point:
     • two sub-accounts inside ONE account at the trustee — same DDA, two FFCs
     • the purpose written into the FFC name as free text, not tagged
     • principal and interest to the SAME account, split in the reference line
     • the dashed DDA number, which is why validation strips hyphens
   A flat one-account form cannot represent this party at all. */
function seedCloExample() {
  const trustee = {
    bankName: 'Northgate Agency & Trust - New York',
    aba: '021000021',
    account: '4417-2830',
  };

  state.accounts = [
    {
      purpose: 'collection', otherLabel: '', currency: 'USD', structure: 'omnibus',
      country: window.countryByCode('US'),
      accountName: 'Kingsbridge CLO VI Ltd.',
      ffcName: 'Kingsbridge CLO VI Ltd / Collection Account',
      ffcNumber: '220417',
      special: 'Principal and interest both settle here; purpose goes in the payment reference',
      values: Object.assign({}, trustee),
    },
    {
      purpose: 'custody', otherLabel: '', currency: 'USD', structure: 'omnibus',
      country: window.countryByCode('US'),
      accountName: 'Kingsbridge CLO VI Ltd.',
      ffcName: 'Kingsbridge CLO VI Ltd / Custody Account',
      ffcNumber: '220419',
      special: 'DTC book-entry settlement — participant and agent bank ID on file',
      values: Object.assign({}, trustee),
    },
  ];
  state.draft = blankDraft();
  state.editIndex = null;
  state.substep = 'details';
}

/* Valid sample data for the account being edited, so the flow can be driven to
   the end in one click when demoing. */
function prefillDraft() {
  const s = acctSchema();
  s.fields.forEach((f) => {
    if (f.type === 'select') { state.draft.values[f.key] = f.options[0]; return; }
    const p = (f.placeholder || '').trim();
    state.draft.values[f.key] = p && !validateField(f, p) ? p : sampleFor(f);
  });
  const d = state.draft;
  d.accountName = 'Kingsbridge CLO VI Ltd.';
  if (state.twoLevel && d.structure === 'omnibus') {
    d.ffcName = suggestedFfcName();
    d.ffcNumber = '220417';
  }
  state.acctErrors = {};
}

function sampleFor(f) {
  if (f.key === 'bankName') return 'Northgate Agency & Trust - New York';
  if (!f.pattern) return 'Sample value';
  const m = f.pattern.match(/\{(\d+)(?:,(\d+))?\}/);
  const n = m ? Number(m[1]) : 8;
  return /A-Za-z/.test(f.pattern) ? 'ABCD'.repeat(n).slice(0, n) : '1'.repeat(n);
}

/* -------------------------------------------------------------- dev tools */

const dev = document.querySelector('.dev');

(function fillDevSelects() {
  dev.querySelector('#dev-country').innerHTML = window.COUNTRIES.map((c) => {
    const verified = !!window.WIRE_RECEIVE[c.code];
    return `<option value="${c.code}">${verified ? '● ' : '○ '}${c.name}</option>`;
  }).join('');
})();

dev.addEventListener('click', (e) => {
  const nav = e.target.closest('[data-goto]');
  if (nav) {
    const to = nav.dataset.goto;
    // Later screens are meaningless empty, so jumping forward fills what the
    // screen needs to actually show something.
    if ((to === 'review' || to === 'done') && !state.accounts.length) seedCloExample();
    state.screen = to;
    state.substep = 'details';
    state.editIndex = null;
    state.acctSubmitted = false;
    modalRoot.innerHTML = '';
    return render();
  }

  const done = e.target.closest('[data-done]');
  if (done) {
    if (!state.accounts.length) seedCloExample();
    state.screen = 'done';
    state.donePhase = done.dataset.done;
    return render();
  }

  const struct = e.target.closest('[data-structure]');
  if (struct) {
    state.draft.structure = struct.dataset.structure;
    state.acctErrors = {};
    return render();
  }

  if (e.target.closest('#dev-seed')) {
    seedCloExample();
    state.screen = 'review';
    modalRoot.innerHTML = '';
    toast('Worked CLO example loaded');
    return render();
  }

  if (e.target.closest('#dev-reset')) {
    Object.assign(state, {
      screen: 'intro',
      accounts: [], draft: blankDraft(), editIndex: null,
      substep: 'details', acctErrors: {}, acctSubmitted: false,
      donePhase: 'checker',
      twoLevel: true, ffcBuild: true, usLabels: true, hints: true,
    });
    dev.querySelector('#dev-prefill').checked = false;
    modalRoot.innerHTML = '';
    return render();
  }
});

dev.addEventListener('change', (e) => {
  const id = e.target.id;

  if (id === 'dev-country') {
    state.draft.country = window.countryByCode(e.target.value);
    state.draft.currency = window.adfAccountFields(state.draft.country.code).currency
      || state.draft.currency;
    state.draft.values = {};
    state.acctErrors = {};
    state.acctSubmitted = false;
    if (dev.querySelector('#dev-prefill').checked) prefillDraft();
    return render();
  }
  if (id === 'dev-twolevel') { state.twoLevel = e.target.checked; return render(); }
  if (id === 'dev-ffcbuild') { state.ffcBuild = e.target.checked; return render(); }
  if (id === 'dev-uslabels') { state.usLabels = e.target.checked; return render(); }
  if (id === 'dev-hints') { state.hints = e.target.checked; return render(); }
  if (id === 'dev-prefill') {
    if (e.target.checked) prefillDraft();
    else {
      state.draft = blankDraft();
      state.acctErrors = {};
      state.acctSubmitted = false;
    }
    return render();
  }
});

function syncDev() {
  dev.querySelectorAll('[data-goto]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.goto === state.screen));
  dev.querySelectorAll('[data-done]').forEach((b) =>
    b.classList.toggle('is-on', state.screen === 'done' && b.dataset.done === state.donePhase));
  dev.querySelectorAll('[data-structure]').forEach((b) =>
    b.classList.toggle('is-on', b.dataset.structure === state.draft.structure));

  dev.querySelector('#dev-twolevel').checked = state.twoLevel;
  dev.querySelector('#dev-ffcbuild').checked = state.ffcBuild;
  dev.querySelector('#dev-uslabels').checked = state.usLabels;
  dev.querySelector('#dev-hints').checked = state.hints;
  dev.querySelector('#dev-twolevel-sub').classList.toggle('is-off', !state.twoLevel);
  dev.querySelector('#dev-country').value = state.draft.country.code;

  // Say plainly whether this country has verified requirements or falls back to
  // the generic form — otherwise the fallback looks like a bug.
  const note = dev.querySelector('#dev-schema-note');
  const s = acctSchema();
  note.textContent = s.generic
    ? '○ No verified schema — generic fallback form'
    : `● ${s.fields.filter((f) => f.req === 'required').length} required account fields · `
      + `${s.usesIban ? 'IBAN' : 'no IBAN'} · ${s.currency}`;
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
