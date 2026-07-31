/* =============================================================================
   Interro — ADF: the data model behind the settlement account-details widget
   (prototypes/admin-details/).

   WHY THIS FILE EXISTS. The capital-call and distribution widgets each collect
   ONE account for ONE payment that is already happening. Private credit does not
   work that way. A lender publishes its settlement details ONCE, as a standing
   record, before any particular payment exists — and that record routinely holds
   SEVERAL accounts, because the same entity settles cash and securities in
   different places and may hold a different account per currency.

   SCOPE: ACCOUNTS, NOT PARTIES. Nothing here models the entity. Legal name,
   entity type, tax status, addresses and contacts belong to the entity master and
   the KYC flow; this widget consumes a resolved party and collects only the
   coordinates money can be sent to.

   Everything below is derived from four real documents (see research.html for the
   full write-up and the quotations):

     ADF   LSTA/LMA Standard Administrative Details Form, effective 31 May 2018
     AQ    LSTA Administrative Questionnaire, January 2005 (still in wide use)
     JT    A COMPLETED CLO admin-details form, supplied privately by Quorim. Not
           in this repo, and its identifiers are not reproduced anywhere in it.
     AF    S&P Global "ADFlow Secure Settlement Instructions" brochure

   THE TWO-LEVEL ACCOUNT. This is the whole point of the widget and it comes
   straight off the completed CLO form, whose cash-wire block has this shape:

       Name of Bank          <trustee> Agency & Trust - New York
       ABA Number            <routing number>
       DDA Account Number    <trustee's account at the bank>
       DDA Account Name      <the CLO's name>
       FFC Account Name      <the CLO's name> / Collection Account
       FFC Account Number    <sub-account number>

   The real values are deliberately not reproduced here or in the seed data. JT
   is a live CLO and those are its live wire coordinates; this repo is mirrored to
   a public GitHub Pages site, and misdirected-payment fraud is the specific risk
   the whole verification apparatus in this market exists to control. The shape is
   what carries the insight, and the shape is not confidential.

   Level 1 (the DDA — Demand Deposit Account) is what the ABA routes to. Level 2
   (the FFC — "for further credit") is the sub-account the money must then be
   applied to. Get level 1 right and level 2 wrong and the wire ARRIVES but is
   never credited to the party: it sits unapplied in the custodian's account,
   which is materially worse than a rejection because nobody gets an error.

   Note what is NOT in this model, because the evidence does not support it:

     • FFA. The prototype brief called the second tag "FFA". The term appears in
       none of the four documents. The pair the market actually writes is
       DDA -> FFC, and it is a hierarchy, not two sibling account types.
     • Splitting accounts by principal vs interest. Tempting, and wrong: JT
       carries both to the SAME collection account and distinguishes them in the
       reference line — `Reference: Loan Name & [Principal or Interest]`.

   THE PURPOSE TAG. No form has one. JT smuggles the purpose into the account
   NAME as free text — "... / Collection Account", "... / Custody Account" —
   which is unqueryable, unvalidatable and invisible to any system downstream.
   Promoting that to a first-class tag is the single clearest thing this widget
   adds. Tags marked `verified` below are lifted from JT verbatim; the two marked
   `inferred` are ours, and research.html says so plainly.

   MULTIPLICITY. Each of the three real forms keys its instruction blocks off a
   different axis and none supports the others:

     ADF/AF  by currency        — "self manage all currency SSIs"
     AQ      by domestic/foreign — "Lender's Domestic" / "Lender's Foreign"
     JT      by purpose/rail    — P&I cash / book-entry / free physical / DVP

   So an account here is keyed by (purpose x currency x bank country), which is a
   superset of all three. Bank country is per account, not per party, and that
   falls out of the same logic: a fund with a USD collection account in New York
   and a EUR account in Frankfurt is ordinary, and a single party-level country
   question could not express it.
   ========================================================================== */

'use strict';

(function () {

  /* NOTE ON SCOPE. An earlier draft also exported ADF_ENTITY_TYPES — the AQ's
     printed lender-type enum (Bank, Asset Manager, Broker/Dealer, CLO/CDO, Hedge
     Fund, Insurance, Special Purpose Vehicle and so on) — for a screen that
     collected the entity. That screen is gone: this widget is account details
     only. The enum is recorded in research.html if it is ever wanted for an
     entity-master form, but it does not belong here and is not exported, because
     an unused global is a thing the next person has to work out. */

  /* ---------------------------------------------------------- account purpose */

  /* `ffcHint` is the exact string JT writes after the entity name in its FFC
     account name, so the widget can offer to build that string rather than
     making someone remember the convention. */
  window.ADF_PURPOSES = [
    {
      key: 'collection',
      label: 'Collection account',
      sub: 'Receives principal, interest and fees',
      ffcHint: 'Collection Account',
      evidence: 'verified',
      note: 'On the completed CLO form this is the account behind "WIRE INSTRUCTIONS '
        + 'FOR LOAN PRINCIPAL AND INTEREST PAYMENTS".',
    },
    {
      key: 'custody',
      label: 'Custody account',
      sub: 'Securities and book-entry settlement',
      ffcHint: 'Custody Account',
      evidence: 'verified',
      note: 'The CLO form holds this as a separate numbered sub-account at the same '
        + 'custodian, distinct from the collection account — same DDA, different FFC.',
    },
    {
      key: 'funding',
      label: 'Funding account',
      sub: 'The account this party wires out of',
      ffcHint: 'Funding Account',
      evidence: 'inferred',
      note: 'Not a tag on any of the four forms. The AQ implies the direction split by '
        + 'capturing the agent\'s instructions separately; we have made it a tag instead.',
    },
    {
      key: 'other',
      label: 'Other',
      sub: 'Name it yourself',
      ffcHint: '',
      evidence: 'inferred',
      note: 'Escape hatch, matching the ADF\'s own "you may provide your own value".',
    },
  ];

  window.adfPurpose = (key) =>
    window.ADF_PURPOSES.find((p) => p.key === key) || window.ADF_PURPOSES[0];

  /* ------------------------------------------------------- account structure */

  /* The ADF ships two wire templates and tells you which to use, verbatim:

       Template 1  "where receiving bank is custodian/trustee, and lender has
                    dedicated account"
       Appendix A  "where recipient is intermediary bank with nostro account for
                    custodian and the Lender does not have a dedicated account"

     That is a genuine either/or with different field sets, and it is the thing
     people get wrong. Asking it in plain language is better than printing two
     templates and hoping the reader picks correctly. */
  window.ADF_STRUCTURES = [
    {
      key: 'dedicated',
      label: 'A dedicated account in this party\'s own name',
      sub: 'The account number below belongs to this party. One level.',
      levels: 1,
    },
    {
      key: 'omnibus',
      label: 'A sub-account inside a custodian\'s account',
      sub: 'The wire lands in the custodian\'s account, then has to be applied on '
        + 'to this party. Two levels — DDA, then FFC.',
      levels: 2,
    },
  ];

  /* ---------------------------------------------------------------- currency */

  /* Deliberately short. A picker of 180 ISO codes would imply Interro can settle
     in all of them; these are the currencies the syndicated-loan market actually
     trades in size. 'Other' is absent on purpose — an unlisted currency is a
     conversation with ops, not a form field. */
  window.ADF_CURRENCIES = ['USD', 'EUR', 'GBP', 'CHF', 'CAD', 'AUD', 'JPY',
    'SEK', 'NOK', 'DKK', 'SGD', 'HKD'];

  /* --------------------------------------------------------- reference line */

  /* The ADF prints a "Standard Wire Reference Format" as three token lines. The
     asterisk beside it in the PDF points at LSTA guidance that is not reproduced
     in the document, so the token ORDER below is verbatim but the meaning of
     each token is our reading.

     This is worth building rather than leaving as free text: the reference line
     is how a payment gets applied to the right facility, and JT's own reference
     is a hand-typed template with a bracketed either/or still in it
     (`Loan Name & [Principal or Interest]`) — i.e. the convention is currently
     enforced by whoever remembers it. */
  window.ADF_REFERENCE_TOKENS = [
    { token: '[Borrower Name]', from: 'deal' },
    { token: '[Facility Name/Abbr.]', from: 'deal' },
    { token: '[Facility/Deal CUSIP/ISIN]', from: 'deal' },
    { token: '[Payment Purpose(s)]', from: 'payment' },
    { token: '[Transaction Reference ID]', from: 'payment' },
  ];

  /* ------------------------------------------------- per-country field split */

  /* wireReceive.js returns ONE flat schema per country, because the distribution
     widget asks a single recipient for everything at once. Here the same fields
     belong to two different owners:

       the PARTY  — legal name and registered address. Asked once.
       the ACCOUNT — bank name, routing identifier, account number, account type,
                     and any purpose code the local regulator mandates. Asked per
                     account, because a party may hold several.

     Asking for the registered address once per account would be the most obvious
     possible tell that the form does not understand its own data. */
  const PARTY_KEYS = new Set(['name', 'street', 'city', 'postcode', 'state']);

  /* `name` in wireReceive means "name on the account". In the two-level case
     that is the CUSTODIAN's account name, not the party's, so it cannot be
     inherited from the party record and has to be asked per account. It is
     re-labelled rather than reused. */
  window.adfAccountFields = function (countryCode) {
    const schema = window.receiveSchema(countryCode);
    return {
      generic: !!schema.generic,
      currency: schema.currency,
      usesIban: schema.usesIban,
      gotcha: schema.gotcha,
      fields: schema.fields.filter((f) => !PARTY_KEYS.has(f.key)),
    };
  };

  window.ADF_PARTY_KEYS = PARTY_KEYS;
})();
