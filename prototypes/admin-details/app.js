/* =============================================================================
   Interro — Settlement Instructions Onboarding (mobile widget prototype)

   Five screens inside the same 390px frame as the other two flows:
     1. "intro"    — what this is and why it is being asked
     2. "party"    — who the counterparty is, once
     3. "accounts" — the repeatable account editor. Two steps on ONE page.
     4. "review"   — everything read back before it becomes a standing record
     5. "done"     — submitted, awaiting approval

   HOW THIS DIFFERS FROM THE OTHER TWO WIDGETS, which is the reason it exists.

   The capital-call widget collects nothing and displays instructions. The
   distribution widget collects one account, for one distribution that has
   already been declared. Both are anchored to a payment.

   Private credit onboarding is not. A lender publishes its settlement details as
   a STANDING RECORD, before any particular payment exists, and it holds SEVERAL
   accounts — because the same entity settles cash and securities in different
   places and may hold a different account per currency. So:

     • No payment context. The flow is initiated by onboarding, not by a wire.
       It alludes to what the details will be used for without pretending a
       specific payment is pending.
     • Accounts are a LIST, not a form. One party, many tagged accounts.
     • Bank country is per ACCOUNT, not per party — a fund with a USD collection
       account in New York and a EUR account in Frankfurt is entirely ordinary.
     • Two levels. DDA then FFC. See the long note in adf.js; the short version
       is that getting level 2 wrong means the wire arrives and is never credited,
       which is worse than a rejection because nobody gets an error.

   Per-country field sets come from ../shared/wireReceive.js, split into
   party-level and account-level by adfAccountFields(). Validation is format-only,
   for the same reason as the other flows: Interro cannot confirm from a form that
   an account exists, but it can stop a 20-character Swiss IBAN.

   Sourcing for every design decision: research.html, alongside this file.
   ========================================================================== */

'use strict';

/* ---------------------------------------------------------------- demo data */

/* The onboarding request comes from a deal, but the details being collected are
   NOT deal-specific — that tension is the design problem this screen solves, so
   the demo data carries both. */
const DEAL = {
  agent: 'Interro Agency Services',
  borrower: 'Cedarline Holdings, LLC',
  facility: 'Term Loan B',
  cusip: '15089TAB2',
  closing: '14 August 2026',
};

/* Invented parties. See the note above seedCloExample() for why nothing here is
   taken from the real forms. */
const PARTY_PRESETS = {
  'CLO/CDO': { name: 'Kingsbridge CLO VI Ltd.', manager: 'Ardent Debt Management U.S. LLC' },
  'Asset Manager': { name: 'Meridian Credit Advisors, LP', manager: '' },
  'Insurance': { name: 'Brightwater Mutual Life Insurance Co.', manager: '' },
  'Hedge Fund': { name: 'Halloway Special Situations Master Fund Ltd.', manager: '' },
};

/* ---------------------------------------------------------------- app state */

const blankParty = () => ({
  legalName: '', entityType: '', manager: '',
  street: '', city: '', country: null, opsEmail: '',
});

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
  screen: 'intro',       // 'intro' | 'party' | 'accounts' | 'review' | 'done'
  party: blankParty(),
  partyErrors: {},
  partySubmitted: false,

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
  reference: true,       // dev tools
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
  if (q.get('reference') === '0') state.reference = false;

  const cc = (q.get('country') || '').toUpperCase();
  if (cc) {
    const c = window.countryByCode(cc);
    if (c) state.draft.country = c;
  }

  const st = q.get('structure');
  if (st === 'dedicated' || st === 'omnibus') state.draft.structure = st;

  if (q.get('seed') === 'clo') seedCloExample();

  const s = q.get('screen');
  if (['party', 'accounts', 'review', 'done'].includes(s)) state.screen = s;

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
  bank: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
           <path d="M3 10 12 4l9 6"/><path d="M5 10v9h14v-9"/><path d="M9 19v-5h6v5"/></svg>`,
};

const escapeAttr = (s) => String(s == null ? '' : s).replace(/"/g, '&quot;');
const escapeHtml = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ============================================================== screen 1 === */

function screenIntro() {
  return `
    <h1>Register your settlement details</h1>

    <p class="intro__lede">
      ${DEAL.agent} needs your standing payment details before ${DEAL.closing}.
      You are filling this in <strong>once</strong> — it becomes the record every
      future payment on this facility is settled against, so there is no form to
      fill in again each time money moves.
    </p>

    <section class="card dealcard">
      <div class="dealcard__head">
        <p class="dealcard__borrower">${DEAL.borrower}</p>
        <p class="dealcard__meta">${DEAL.facility} · CUSIP ${DEAL.cusip}</p>
      </div>
      <div class="dealcard__foot">
        <span class="label">Requested by</span>
        <span class="value">${DEAL.agent}</span>
      </div>
    </section>

    <ol class="steps">
      <li><strong>Who you are</strong>Legal name, entity type and one operations
        contact. Asked once.</li>
      <li><strong>Your accounts</strong>As many as you settle through. Tag each one
        so payments land in the right place.</li>
      <li><strong>Review and submit</strong>Your details go to approval, then become
        your standing record.</li>
    </ol>

    <div class="originnote">
      ${ICON.layers}
      <p>
        Most parties have <strong>more than one account</strong> — a collection
        account for cash and a custody account for securities is the common case.
        You can add as many as you need.
      </p>
    </div>

    <div class="originnote">
      ${ICON.lock}
      <p>
        These details are used to send money <em>to</em> you. Nothing is charged and
        no payment is initiated by this form.
      </p>
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="intro-continue">Get started →</button>
    </div>`;
}

/* ============================================================== screen 2 === */

/* Party-level fields. Deliberately short. The LSTA forms surround this with LEI,
   MEI, GIIN, CRN, EIN, tax residence and a W-8/W-9 decision tree — all of which
   belong to KYC and none of which affects where a wire goes. A settlement widget
   should consume a resolved entity, not re-collect its identifiers. */
const PARTY_FIELDS = [
  {
    key: 'legalName', label: 'Legal name of the party', us: 'As it appears in the credit agreement',
    req: 'required', type: 'text', placeholder: 'e.g. Kingsbridge CLO VI Ltd.',
    hint: 'The legal entity, not the manager. If you are signing for a fund, name the fund.',
  },
  {
    key: 'entityType', label: 'Party type', us: null,
    req: 'required', type: 'select', options: window.ADF_ENTITY_TYPES,
    hint: 'The list is the LSTA Administrative Questionnaire\'s own.',
  },
  {
    key: 'manager', label: 'Manager or adviser', us: 'Appears in the signature block',
    req: 'optional', type: 'text', placeholder: 'e.g. Ardent Debt Management U.S. LLC',
    hint: 'If the party is managed, who signs on its behalf.',
  },
  {
    key: 'street', label: 'Registered address', us: 'Address line',
    req: 'required', type: 'text', placeholder: '1301 Fannin Street, Suite 1900',
    hint: 'A street address. P.O. boxes are rejected by most correspondent banks.',
  },
  {
    key: 'city', label: 'City / town', us: 'Town name',
    req: 'required', type: 'text', placeholder: 'Houston',
    hint: 'Required on every cross-border payment under FATF Recommendation 16.',
  },
  {
    key: 'opsEmail', label: 'Operations contact for settlement queries',
    us: 'Where ops writes when a payment fails',
    req: 'required', type: 'text', placeholder: 'loanops@example.com',
    pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]{2,}$',
    invalid: 'Enter a single email address.',
    hint: 'A shared mailbox is better than a person — the LSTA form recommends a group.',
  },
];

function screenParty() {
  const errKeys = state.partySubmitted ? Object.keys(state.partyErrors) : [];

  return `
    <h1>About the party</h1>

    <p class="intro__lede">
      Asked once, for the entity itself. Your accounts come next.
    </p>

    ${errKeys.length ? errSummary(errKeys, state.partyErrors, PARTY_FIELDS) : ''}

    <form id="partyform" novalidate>
      ${PARTY_FIELDS.map((f) => fieldHtml(f, state.party[f.key], state.partyErrors[f.key],
        state.partySubmitted, 'p')).join('')}

      <div class="fgroup">
        <label class="flabel" for="party-country-trigger">
          Country the party is organised in <span class="req">*</span>
        </label>
        ${CountryPicker.trigger({
          selected: state.party.country,
          placeholder: 'Select country',
          id: 'party-country-trigger',
          error: !!state.partyErrors.country && state.partySubmitted,
        })}
        ${state.partySubmitted && state.partyErrors.country
          ? `<p class="ferror">${state.partyErrors.country}</p>`
          : (state.hints
            ? `<p class="fhelp">Where the entity is organised — not where it banks.
                 Those are asked separately and are often different.</p>`
            : '')}
      </div>
    </form>

    <div class="actions">
      <button class="btn btn--primary" id="party-continue">Continue →</button>
      <button class="btn btn--quiet" id="party-back">← Back</button>
    </div>`;
}

/* ============================================================== screen 3 === */

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
    hint: 'The sub-account the money is applied on to. Convention is your entity '
      + 'name, then the account\'s purpose.',
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

/* The assembled standard reference line. Read-only: the deal half comes from the
   facility and the payment half is per-payment, so there is nothing here for the
   party to type. Showing it answers the question the free-text "Reference" field
   on every paper form leaves open. */
function referenceBlock() {
  const line1 = `${DEAL.borrower}`;
  const line2 = `${DEAL.facility} ${DEAL.cusip}`;
  const line3 = `${window.adfPurpose(state.draft.purpose).label} [Transaction Reference ID]`;

  return `
    <div class="refbuild">
      <p class="refbuild__label">Reference line every payment will carry</p>
      <pre class="refbuild__body">${escapeHtml(line1)}
${escapeHtml(line2)}
${escapeHtml(line3)}</pre>
      <p class="refbuild__note">
        The LSTA/LMA standard format. Interro fills this in — you do not have to
        remember it, and it is why payments get applied to the right facility.
      </p>
    </div>`;
}

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

      <div class="fgroup">
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
            Asked per account, not per party — the fields below change with it.
            A ${d.country.name} account needs
            ${s.usesIban ? 'an IBAN' : 'a national routing code, not an IBAN'}.
          </p>` : ''}
      </div>

      <div class="fgroup">
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
      ${[fields[0]].concat(s.fields).map((f) =>
        fieldHtml(f, ownOrValue(f.key), state.acctErrors[f.key], state.acctSubmitted, 'a')).join('')}
    </section>

    ${twoLevel ? `
      <section class="fsection fsection--l2">
        <p class="fsection__title">Level 2 — your sub-account</p>
        <p class="fsection__sub">
          “For further credit”. Without it the wire reaches the custodian and stops
          there — credited to nobody, with no error raised.
        </p>
        ${fields.slice(1).map((f) =>
          fieldHtml(f, ownOrValue(f.key), state.acctErrors[f.key], state.acctSubmitted, 'a')).join('')}
        ${state.ffcBuild && d.purpose !== 'other' && state.party.legalName ? `
          <button type="button" class="ffcbuild" id="ffc-build">
            Use “${escapeHtml(suggestedFfcName())}”
          </button>` : ''}
      </section>` : ''}

    ${state.reference ? referenceBlock() : ''}

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

function suggestedFfcName() {
  const p = window.adfPurpose(state.draft.purpose);
  return `${state.party.legalName} / ${p.ffcHint}`;
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

function validateParty() {
  const errors = {};
  PARTY_FIELDS.forEach((f) => {
    const msg = validateField(f, state.party[f.key]);
    if (msg) errors[f.key] = msg;
  });
  if (!state.party.country) errors.country = 'Select the country the party is organised in.';
  state.partyErrors = errors;
  return !Object.keys(errors).length;
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

/* ============================================================== screen 4 === */

function screenReview() {
  const p = state.party;
  return `
    <h1>Review before submitting</h1>

    <p class="intro__lede">
      This becomes ${escapeHtml(p.legalName || 'the party')}'s standing settlement
      record. Changing it later needs approval, so it is worth a read now.
    </p>

    <section class="card summary instr">
      <div class="summary__head">The party</div>
      ${[
        ['Legal name', p.legalName],
        ['Party type', p.entityType],
        ['Manager or adviser', p.manager],
        ['Registered address', [p.street, p.city].filter(Boolean).join(', ')],
        ['Organised in', p.country ? p.country.name : ''],
        ['Operations contact', p.opsEmail],
      ].filter((r) => r[1]).map((r) => `
        <div class="row">
          <div class="row__label">${r[0]}</div>
          <div class="row__value">${escapeHtml(r[1])}</div>
        </div>`).join('')}
      <div class="row">
        <div class="row__label"></div>
        <div class="row__value">
          <button class="linkbtn" id="edit-party">Edit party details</button>
        </div>
      </div>
    </section>

    <p class="reviewhead">
      ${state.accounts.length} account${state.accounts.length === 1 ? '' : 's'}
    </p>

    ${state.accounts.length
      ? committedList(false)
      : `<div class="gotcha">
           ${ICON.warn}
           <p>No accounts added yet. At least one is needed before you can submit.</p>
         </div>`}

    <button class="btn btn--ghost" id="add-more">+ Add another account</button>

    <div class="originnote">
      ${ICON.lock}
      <p>
        Submitting sends this for approval inside ${DEAL.agent}. You will get a copy,
        and you will be told before it is used for the first payment.
      </p>
    </div>

    <div class="actions">
      <button class="btn btn--primary" id="submit" ${state.accounts.length ? '' : 'disabled'}>
        Submit settlement details →
      </button>
      <button class="btn btn--quiet" id="review-back">← Back</button>
    </div>`;
}

/* ============================================================== screen 5 === */

/* Three endings, because which one Interro ships is a policy question this
   prototype is meant to surface rather than answer.

   S&P Global's ADFlow brochure states the market is deliberately moving OFF
   phone callbacks — "institutions have been able to move away from laborious and
   outdated call-back requirements for SSIs", and "Remove Call-Backs" is a named
   benefit — replacing them with a maker/checker approval and version history.
   'checker' is therefore the default and 'callback' is shown for comparison. */
function screenDone() {
  const n = state.accounts.length;

  if (state.donePhase === 'published') {
    return `
      <div class="terminal">
        <div class="terminal__icon">${ICON.check}</div>
        <h1 class="terminal__heading">Published</h1>
        <p class="terminal__sub">
          ${escapeHtml(state.party.legalName || 'The party')}'s settlement details are
          live. ${n} account${n === 1 ? '' : 's'} on record, version 1.
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
          Before these details can be used, ${DEAL.agent} will call your operations
          contact on a number already on file to read them back.
        </p>
        <section class="card statuscard">
          <div class="statusrow is-done">
            <span class="statusrow__tick">${ICON.check}</span>
            <div><p class="statusrow__t">Details received</p></div>
          </div>
          <div class="statusrow">
            <span class="spinner"></span>
            <div>
              <p class="statusrow__t">Callback to ${escapeHtml(state.party.opsEmail || 'your ops contact')}</p>
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
        ${n} account${n === 1 ? '' : 's'} for
        ${escapeHtml(state.party.legalName || 'the party')}. Two people at
        ${DEAL.agent} review settlement details before they can be used — nobody
        needs to call you.
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
            <p class="statusrow__s">A second approver at ${DEAL.agent}</p>
          </div>
        </div>
        <div class="statusrow is-pending">
          <span class="statusrow__dot"></span>
          <div>
            <p class="statusrow__t">Published to the facility</p>
            <p class="statusrow__s">Usable from ${DEAL.closing}</p>
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

/* `ns` namespaces the input id so the party and account forms can both be on the
   page across renders without colliding. */
function fieldHtml(f, value, err, submitted, ns) {
  const v = value || '';
  const showErr = submitted ? err : null;
  const ok = !showErr && String(v).trim() && !validateField(f, v);
  const id = `f-${f.key}`;
  const attr = ns === 'p' ? 'data-party' : (OWN_KEYS.has(f.key) ? 'data-own' : 'data-field');

  const chip = f.req === 'conditional'
    ? '<span class="reqchip reqchip--conditional">If you have one</span>'
    : f.req === 'optional'
      ? '<span class="reqchip reqchip--optional">Optional</span>'
      : '<span class="req">*</span>';

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
    <div class="fgroup" id="g-${f.key}">
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
  party: screenParty,
  accounts: screenAccounts,
  review: screenReview,
  done: screenDone,
};

const STEP = { intro: 1, party: 2, accounts: 3, review: 4, done: 5 };

function renderProgress() {
  const step = STEP[state.screen];
  progress.innerHTML = Array.from({ length: 5 }, (_, i) =>
    `<span class="progress__seg ${i < step ? 'is-on' : ''}"></span>`).join('');
  progress.setAttribute('aria-valuenow', String(step));
}

function render() {
  // Guards for hand-edited deep links: review and done are meaningless without
  // a party, and the "another?" step without a saved account.
  if ((state.screen === 'review' || state.screen === 'done')
      && !state.party.legalName && !state.accounts.length) {
    state.screen = 'party';
  }
  if (state.screen === 'accounts' && state.substep === 'another' && !state.accounts.length) {
    state.substep = 'details';
  }

  app.innerHTML = SCREENS[state.screen]();
  renderProgress();
  syncDev();
  scroll.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ------------------------------------------------------------------ events */

app.addEventListener('click', (e) => {
  if (e.target.closest('#party-country-trigger')) {
    return CountryPicker.open({
      root: modalRoot,
      selected: state.party.country,
      title: 'Where is the party organised?',
      onSelect: (c) => {
        state.party.country = c;
        delete state.partyErrors.country;
        render();
      },
    });
  }

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
      state.screen = 'party';
      return render();

    case 'party-back':
      state.screen = 'intro';
      return render();

    case 'party-continue': {
      state.partySubmitted = true;
      if (!validateParty()) {
        render();
        return toast('Some details need attention');
      }
      state.screen = 'accounts';
      state.substep = 'details';
      // Default the first account's bank country to where the party is organised.
      // Usually right, always editable, and it saves the commonest interaction.
      if (!state.accounts.length && state.party.country) {
        state.draft.country = state.party.country;
        state.draft.currency = window.adfAccountFields(state.party.country.code).currency
          || state.draft.currency;
      }
      return render();
    }

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
      state.screen = state.accounts.length ? 'review' : 'party';
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

    case 'edit-party':
      state.screen = 'party';
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
  const t = e.target;
  const ds = t.dataset || {};

  if (ds.party) {
    state.party[ds.party] = t.value;
    if (state.partySubmitted) liveRevalidate(t, PARTY_FIELDS, state.partyErrors, ds.party);
    return;
  }
  const key = ds.own || ds.field;
  if (!key) return;
  setDraftValue(key, t.value);
  if (state.acctSubmitted) {
    liveRevalidate(t, ownFields().concat(acctSchema().fields), state.acctErrors, key);
  }
});

/* Re-render only when the error state actually flips, so the caret is not yanked
   out of the input on every keystroke. */
function liveRevalidate(el, fields, errors, key) {
  const f = fields.find((x) => x.key === key);
  if (!f) return;
  const msg = validateField(f, el.value);
  const had = errors[key];
  if (msg) errors[key] = msg; else delete errors[key];
  if (!!msg !== !!had) {
    const pos = el.selectionStart;
    render();
    const again = document.getElementById(`f-${key}`);
    if (again) { again.focus(); try { again.setSelectionRange(pos, pos); } catch (_) {} }
  }
}

app.addEventListener('change', (e) => {
  const t = e.target;
  if (t.tagName !== 'SELECT') return;
  const ds = t.dataset || {};
  if (ds.party) {
    state.party[ds.party] = t.value;
    if (state.partySubmitted) validateParty();
    return render();
  }
  const key = ds.own || ds.field;
  if (!key) return;
  setDraftValue(key, t.value);
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
  state.party = {
    legalName: 'Kingsbridge CLO VI Ltd.',
    entityType: 'CLO/CDO',
    manager: 'Ardent Debt Management U.S. LLC',
    street: 'c/o Calder Loan Services, LP, 1301 Fannin Street, Suite 1900',
    city: 'Houston',
    country: window.countryByCode('US'),
    opsEmail: 'notices.kingsbridgeclovi@example.com',
  };
  state.partyErrors = {};
  state.partySubmitted = false;

  const trustee = {
    bankName: 'Northgate Agency & Trust - New York',
    aba: '021000021',
    account: '4417-2830',
    accountType: 'Checking',
  };

  state.accounts = [
    {
      purpose: 'collection', otherLabel: '', currency: 'USD', structure: 'omnibus',
      country: window.countryByCode('US'),
      accountName: 'Kingsbridge CLO VI Ltd.',
      ffcName: 'Kingsbridge CLO VI Ltd / Collection Account',
      ffcNumber: '220417',
      special: 'Reference: Loan Name & [Principal or Interest]',
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
  d.accountName = state.party.legalName || 'Meridian Credit Advisors, LP';
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

function prefillParty() {
  const preset = PARTY_PRESETS[state.party.entityType] || PARTY_PRESETS['Asset Manager'];
  state.party = {
    legalName: preset.name,
    entityType: state.party.entityType || 'Asset Manager',
    manager: preset.manager,
    street: '1301 Fannin Street, Suite 1900',
    city: 'Houston',
    country: window.countryByCode('US'),
    opsEmail: 'loanops@example.com',
  };
  state.partyErrors = {};
}

/* -------------------------------------------------------------- dev tools */

const dev = document.querySelector('.dev');

(function fillDevSelects() {
  dev.querySelector('#dev-entity').innerHTML = window.ADF_ENTITY_TYPES
    .map((t) => `<option value="${escapeAttr(t)}">${escapeHtml(t)}</option>`).join('');

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
    if (to === 'review' || to === 'done') {
      if (!state.party.legalName) prefillParty();
      if (!state.accounts.length) seedCloExample();
    }
    if (to === 'accounts' && !state.party.legalName) prefillParty();
    state.screen = to;
    state.substep = 'details';
    state.editIndex = null;
    state.acctSubmitted = false;
    state.partySubmitted = false;
    modalRoot.innerHTML = '';
    return render();
  }

  const done = e.target.closest('[data-done]');
  if (done) {
    if (!state.accounts.length) seedCloExample();
    if (!state.party.legalName) prefillParty();
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
      party: blankParty(), partyErrors: {}, partySubmitted: false,
      accounts: [], draft: blankDraft(), editIndex: null,
      substep: 'details', acctErrors: {}, acctSubmitted: false,
      donePhase: 'checker',
      twoLevel: true, ffcBuild: true, usLabels: true, hints: true, reference: true,
    });
    dev.querySelector('#dev-prefill').checked = false;
    modalRoot.innerHTML = '';
    return render();
  }
});

dev.addEventListener('change', (e) => {
  const id = e.target.id;

  if (id === 'dev-entity') {
    state.party.entityType = e.target.value;
    const preset = PARTY_PRESETS[e.target.value];
    // Only overwrite the name when the preset has one and nothing has been typed
    // over it — silently replacing edited input would be hostile.
    if (preset && (!state.party.legalName || Object.values(PARTY_PRESETS)
        .some((p) => p.name === state.party.legalName))) {
      state.party.legalName = preset.name;
      state.party.manager = preset.manager;
    }
    return render();
  }
  if (id === 'dev-country') {
    state.draft.country = window.countryByCode(e.target.value);
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
  if (id === 'dev-reference') { state.reference = e.target.checked; return render(); }
  if (id === 'dev-prefill') {
    if (e.target.checked) { prefillParty(); prefillDraft(); }
    else {
      state.party = blankParty();
      state.draft = blankDraft();
      state.partyErrors = {}; state.acctErrors = {};
      state.partySubmitted = false; state.acctSubmitted = false;
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
  dev.querySelector('#dev-reference').checked = state.reference;
  dev.querySelector('#dev-twolevel-sub').classList.toggle('is-off', !state.twoLevel);
  dev.querySelector('#dev-country').value = state.draft.country.code;
  if (state.party.entityType) dev.querySelector('#dev-entity').value = state.party.entityType;

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
