/* =============================================================================
   Interro — WIRE_SEND: outbound field vocabulary by the PAYER's bank country

   SCOPE — read this before editing:

   This table is for the CAPITAL CALL widget only, where the beneficiary is
   ALWAYS Interro's own U.S. bank account. Nothing about the beneficiary varies:
   same account number, same ABA, same SWIFT/BIC, same U.S. address, whoever is
   paying. There is no IBAN anywhere in this file because the United States does
   not use IBAN — a payer whose bank form demands an IBAN has a bank that has
   mis-detected the destination, which is itself worth telling them.

   So this file carries exactly two things:

     labels — what the payer's OWN bank calls each field on its outbound form.
              The mismatch between "Wire Memo / Reference" and
              "Verwendungszweck" is the entire reason wires get stranded: the
              payer cannot find the field Interro named, so they leave it blank.
     extras — what the payer's own bank/regulator demands in order to send money
              OUT of that country, which Interro's instructions have no reason to
              mention but the payer cannot complete the wire without. Japan's
              国際収支コード, China's 汇款用途, India's Form A2, Brazil's contrato
              de câmbio. These have no U.S. counterpart at all.

   The mirror-image table — actual per-country field SCHEMAS for a beneficiary
   outside the U.S. — is WIRE_RECEIVE, used by the distributions widget. Do not
   conflate them: this file is vocabulary, that file is validation.

   Sourcing: every country's `_source` names the research batch behind it, in
   /research/raw/. Labels marked `unverified: true` came from bank help-page
   prose rather than a fetched primary form — they are directionally right but
   should not be treated as verbatim on-screen text without confirmation.

   Countries absent from this table degrade to Interro's generic English
   instructions. That is the intended fallback, not a bug.
   ========================================================================== */

'use strict';

/* Recurring notes, written once. Several jurisdictions share the same trap. */
const N = {
  noIban:
    'Your bank may offer an IBAN field. Leave it empty — the United States does '
    + 'not use IBAN. Use the account number and routing number below.',
  romanize:
    'Enter in Latin characters exactly as shown. Do not translate or transliterate '
    + 'the beneficiary name.',
  memo:
    'This is the field investors most often leave blank. Without the code, Interro '
    + 'cannot match your payment to your commitment.',
  charges:
    'Choose the option where you, the sender, pay all fees — so the full capital '
    + 'call amount arrives.',
};

window.WIRE_SEND = {

  /* ===================================================== English-language ===
     Included so the localized layout stays consistent when the payer's bank
     happens to label things in English. Little translation value, but the
     outbound-side extras and the no-IBAN warning still earn their place. */

  US: {
    lang: 'English',
    sameCountry: true,           // picking this on the international route is a contradiction
    _source: 'research/raw/07-anglo-eastasia.md',
    labels: {
      memo: { local: 'Reference / Special Instructions', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Fee Instruction', us: 'Charges / Fee Instruction', note: N.charges },
    },
    extras: [],
  },

  GB: {
    lang: 'English',
    _source: 'research/raw/07-anglo-eastasia.md — HSBC, Barclays, Lloyds, NatWest',
    labels: {
      beneficiaryName: { local: 'Payee name', us: 'Beneficiary Name',
        note: 'HSBC requires the exact name as given in the payment instruction.' },
      account: { local: 'Account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'BIC / SWIFT (bank code)', us: 'SWIFT / BIC Code' },
      aba: { local: 'Routing / ABA number', us: 'Routing Number (ABA / Fedwire)',
        note: 'UK forms surface this only once the destination is set to the United States.' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Charges option (OUR / SHA / BEN)', us: 'Charges / Fee Instruction',
        note: 'Select OUR. UK banks default to SHA, which deducts correspondent fees from the amount.' },
    },
    extras: [
      { local: 'Reason for payment', us: 'Purpose of payment',
        value: 'Capital contribution to an investment fund',
        note: 'HSBC states this "helps us avoid delays"; Lloyds presents it as a dropdown.' },
    ],
  },

  CA: {
    lang: 'English',
    _source: 'research/raw/07-anglo-eastasia.md — TD, RBC',
    labels: {
      swift: { local: 'Swift Code / BIC / IBAN', us: 'SWIFT / BIC Code',
        note: 'TD groups these into one field and switches on destination. Enter the SWIFT/BIC — '
            + 'ignore the IBAN part of the label, the U.S. has no IBAN.' },
      account: { local: 'Account number / IBAN / CLABE', us: 'Beneficiary Account Number',
        note: 'Another combined, destination-switched field. Enter the plain account number.' },
      aba: { local: 'Routing / ABA number', us: 'Routing Number (ABA / Fedwire)',
        note: 'Appears once the destination is set to the United States.' },
      memo: { local: 'Purpose / description', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  AU: {
    lang: 'English',
    _source: 'research/raw/07-anglo-eastasia.md — CommBank, Westpac, NAB, ANZ',
    labels: {
      beneficiaryName: { local: 'Recipient / Payee', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Recipient address (no PO Box)', us: 'Beneficiary Address',
        note: 'CommBank rejects PO boxes outright. The address below is a street address.' },
      account: { local: 'Account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC code', us: 'SWIFT / BIC Code' },
      aba: { local: 'ABA routing', us: 'Routing Number (ABA / Fedwire)',
        note: 'Westpac offers "either an IBAN, ABA routing, bank and branch details, IFSC or '
            + 'SWIFT/BIC" depending on destination. For the U.S., that is the ABA.' },
      memo: { local: 'Description', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Transfer purpose', us: 'Purpose of payment',
        value: 'Investment / capital contribution',
        note: 'Westpac: "depending on where you are sending payment to, you may also need to '
            + 'select the Transfer purpose."' },
    ],
  },

  NZ: {
    lang: 'English',
    _source: 'research/raw/07-anglo-eastasia.md — ANZ NZ (BNZ page fetch failed)',
    labels: {
      account: { local: 'Beneficiary account number', us: 'Beneficiary Account Number', note: N.noIban },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Purpose of payment', us: 'Purpose of payment',
        value: 'Investment / capital contribution',
        note: 'ANZ NZ enforces a clear purpose in SWIFT field F70 even where the UI does not '
            + 'present it as a dropdown.' },
    ],
  },

  IE: {
    lang: 'English',
    _source: 'research/raw/02-europe-west.md — Bank of Ireland',
    labels: {
      account: { local: 'Account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  SG: {
    lang: 'English',
    _source: 'research/raw/04-apac.md — DBS, OCBC, UOB; MAS Notice 626',
    labels: {
      account: { local: 'Beneficiary account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Beneficiary bank SWIFT/BIC', us: 'SWIFT / BIC Code' },
      memo: { local: 'Payment details / reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Originator full details', us: 'Sender information',
        value: 'Your full name, account number and address',
        note: 'Mandatory for wires of SGD 2,000 or more under MAS Notice 626. Singapore has no '
            + 'market-wide purpose-code requirement.' },
    ],
  },

  HK: {
    lang: 'English / 繁體中文',
    _source: 'research/raw/07-anglo-eastasia.md — Standard Chartered HK, HSBC HK, BOCHK',
    labels: {
      beneficiaryName: { local: 'Beneficiary name (payee)', us: 'Beneficiary Name',
        note: 'Standard Chartered HK requires the payee to be registered as a Telegraphic '
            + 'Transfer payee before you can remit. Do this first — it is not instant.' },
      account: { local: 'Beneficiary account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Beneficiary bank name & SWIFT code', us: 'SWIFT / BIC Code' },
      charges: { local: 'Charges option', us: 'Charges / Fee Instruction', note: N.charges },
    },
    extras: [
      { local: 'Purpose of remittance / payment details', us: 'Purpose of payment',
        value: 'Capital contribution to an investment fund',
        note: 'Present on BOCHK and HSBC HK outward-payment application forms. Exact on-form '
            + 'wording unverified — the source PDF would not parse.' },
    ],
  },

  KY: {
    lang: 'English',
    _source: 'research/raw/06-offshore-latam.md',
    labels: {
      account: { local: 'Beneficiary Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Beneficiary Bank / SWIFT Code', us: 'SWIFT / BIC Code',
        note: 'Cayman forms accept a SWIFT/BIC or, for U.S. destinations, an ABA routing number.' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  BM: {
    lang: 'English',
    _source: 'research/raw/06-offshore-latam.md — HSBC Bermuda',
    labels: {
      account: { local: 'Beneficiary Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  VG: {
    lang: 'English',
    unverified: true,
    _source: 'research/raw/06-offshore-latam.md — no BVI-published wire form found',
    labels: {
      account: { local: 'Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Where do you actually bank?', us: 'Bank jurisdiction check',
        value: 'Confirm before sending',
        note: 'The BVI has almost no local banking sector. BVI-incorporated vehicles nearly '
            + 'always bank in Cayman, Singapore or elsewhere — pick the country your BANK is '
            + 'in, not where the entity is registered.' },
    ],
  },

  JE: {
    lang: 'English',
    _source: 'research/raw/06-offshore-latam.md',
    labels: {
      account: { local: 'Beneficiary Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  GG: {
    lang: 'English',
    _source: 'research/raw/06-offshore-latam.md',
    labels: {
      account: { local: 'Beneficiary Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  ZA: {
    lang: 'English',
    _source: 'research/raw/05-mea.md — Standard Bank, SARB Financial Surveillance',
    labels: {
      account: { local: 'Account number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: "SWIFT/BIC of beneficiary's bank", us: 'SWIFT / BIC Code' },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'BOP category code', us: 'No U.S. equivalent',
        value: 'Ask your bank for the outward-investment category',
        note: 'Standard Bank: "you must associate every inward or outward payment to a BOP '
            + 'category." A South African Reserve Bank requirement — the wire will not leave '
            + 'without it.' },
    ],
  },

  PH: {
    lang: 'English / Filipino',
    _source: 'research/raw/04-apac.md — BSP',
    labels: {
      account: { local: 'Account number', us: 'Beneficiary Account Number', note: N.noIban },
      memo: { local: 'Payment reference', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Purpose of remittance', us: 'Purpose of payment',
        value: 'Capital contribution to an investment fund — capital call',
        note: 'The BSP requires specific language. Generic entries like "transfer" or "payment" '
            + 'are rejected. Name the fund and the capital call.' },
    ],
  },

  /* ============================================================== Germanic === */

  DE: {
    lang: 'German',
    _source: 'research/raw/02-europe-west.md — Bundesbank AWV/Z4',
    labels: {
      beneficiaryName: { local: 'Empfänger / Begünstigter', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Anschrift des Empfängers', us: 'Beneficiary Address' },
      account: { local: 'Kontonummer des Empfängers', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'BIC der Empfängerbank', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Empfängerbank', us: 'Receiving Bank' },
      bankAddress: { local: 'Adresse der Empfängerbank', us: 'Bank Address' },
      bankCountry: { local: 'Land der Empfängerbank', us: 'Bank Country' },
      amount: { local: 'Betrag', us: 'Amount' },
      currency: { local: 'Währung', us: 'Currency' },
      memo: { local: 'Verwendungszweck', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Spesenregelung', us: 'Charges / Fee Instruction', note: N.charges },
    },
    extras: [
      { local: 'AWV-Meldung / Z4-Meldung', us: 'Bundesbank statistical report',
        value: 'Applies above €12,500',
        note: 'Payments over €12,500 trigger a Bundesbank AWV reporting obligation. Your bank '
            + 'usually files it, but confirm — it is your obligation, not theirs.' },
    ],
  },

  AT: {
    lang: 'German',
    _source: 'research/raw/02-europe-west.md — OeNB',
    labels: {
      beneficiaryName: { local: 'Empfänger', us: 'Beneficiary Name' },
      account: { local: 'Kontonummer des Empfängers', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'BIC', us: 'SWIFT / BIC Code',
        note: 'The OeNB dropped the BIC requirement only for intra-EEA euro transfers. A USD '
            + 'wire to the U.S. still needs it.' },
      amount: { local: 'Betrag', us: 'Amount' },
      currency: { local: 'Währung', us: 'Currency' },
      memo: { local: 'Verwendungszweck', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Spesenregelung', us: 'Charges / Fee Instruction', note: N.charges },
    },
    extras: [],
  },

  CH: {
    lang: 'German / French / Italian',
    _source: 'research/raw/08-india-latam-ce.md — UBS, PostFinance',
    labels: {
      beneficiaryName: { local: 'Zahlungsempfänger', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Adresse des Zahlungsempfängers', us: 'Beneficiary Address' },
      account: { local: 'Kontonummer des Zahlungsempfängers', us: 'Beneficiary Account Number',
        note: 'UBS labels this IBAN by default. The U.S. has no IBAN — enter the account number.' },
      swift: { local: 'BIC des Finanzinstituts des Zahlungsempfängers', us: 'SWIFT / BIC Code',
        note: 'UBS notes IBAN alone can suffice inside SEPA, but a BIC plus bank name and '
            + 'address are required outside the euro payment area.' },
      bankName: { local: 'Name der Bank des Zahlungsempfängers', us: 'Receiving Bank' },
      bankAddress: { local: 'Adresse der Bank des Zahlungsempfängers', us: 'Bank Address' },
      amount: { local: 'Betrag', us: 'Amount' },
      currency: { local: 'Währung', us: 'Currency' },
      memo: { local: 'Mitteilung / Zahlungsgrund', us: 'Wire Memo / Reference', note: N.memo,
        unverified: true },
      charges: { local: 'Spesenregelung (SHA / OUR / BEN)', us: 'Charges / Fee Instruction',
        note: 'Select OUR. SHA is the Swiss default and deducts correspondent fees en route.' },
    },
    extras: [],
  },

  NL: {
    lang: 'Dutch',
    _source: 'research/raw/02-europe-west.md',
    labels: {
      beneficiaryName: { local: 'Begunstigde', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Adres begunstigde', us: 'Beneficiary Address' },
      account: { local: 'Rekeningnummer begunstigde', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'BIC/SWIFT-code bank begunstigde', us: 'SWIFT / BIC Code' },
      amount: { local: 'Bedrag', us: 'Amount' },
      currency: { local: 'Valuta', us: 'Currency' },
      memo: { local: 'Omschrijving', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  BE: {
    lang: 'Dutch / French',
    _source: 'research/raw/02-europe-west.md — dual-language forms',
    labels: {
      beneficiaryName: { local: 'Begunstigde / Bénéficiaire', us: 'Beneficiary Name',
        note: 'Belgian forms are bilingual; either label is the same field.' },
      account: { local: 'Rekeningnummer / Numéro de compte', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC', us: 'SWIFT / BIC Code' },
      amount: { local: 'Bedrag / Montant', us: 'Amount' },
      memo: { local: 'Mededeling / Communication', us: 'Wire Memo / Reference',
        note: 'Use the free-text field. The structured "gestructureerde mededeling" is a '
            + 'domestic-only convention and will not carry across a SWIFT wire.' },
    },
    extras: [],
  },

  /* ============================================================== Romance === */

  FR: {
    lang: 'French',
    _source: 'research/raw/02-europe-west.md',
    labels: {
      beneficiaryName: { local: 'Bénéficiaire', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Adresse du bénéficiaire', us: 'Beneficiary Address' },
      account: { local: 'Numéro de compte du bénéficiaire', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC de la banque du bénéficiaire', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Banque du bénéficiaire', us: 'Receiving Bank' },
      amount: { local: 'Montant', us: 'Amount' },
      currency: { local: 'Devise', us: 'Currency' },
      memo: { local: 'Motif / référence du virement', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Frais', us: 'Charges / Fee Instruction', note: N.charges },
    },
    extras: [],
  },

  LU: {
    lang: 'French',
    _source: 'research/raw/02-europe-west.md — ABBL',
    labels: {
      beneficiaryName: { local: 'Bénéficiaire', us: 'Beneficiary Name' },
      account: { local: 'Numéro de compte du bénéficiaire', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC/SWIFT', us: 'SWIFT / BIC Code',
        note: 'The ABBL notes payers are no longer obliged to state the BIC — but the bank still '
            + 'resolves one internally, and supplying it avoids a repair.' },
      amount: { local: 'Montant', us: 'Amount' },
      memo: { local: 'Communication / référence', us: 'Wire Memo / Reference',
        note: 'Treat this as mandatory even if your form marks it optional. Luxembourg fund '
            + 'flows route through omnibus and custodian accounts, so this reference is the '
            + 'only thing tying your money to your commitment.' },
    },
    extras: [],
  },

  IT: {
    lang: 'Italian',
    _source: 'research/raw/02-europe-west.md',
    labels: {
      beneficiaryName: { local: 'Beneficiario', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Indirizzo del beneficiario', us: 'Beneficiary Address' },
      account: { local: 'Numero di conto del beneficiario', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC/SWIFT banca beneficiaria', us: 'SWIFT / BIC Code' },
      amount: { local: 'Importo', us: 'Amount' },
      currency: { local: 'Valuta', us: 'Currency' },
      memo: { local: 'Causale', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  ES: {
    lang: 'Spanish',
    _source: 'research/raw/02-europe-west.md',
    labels: {
      beneficiaryName: { local: 'Beneficiario', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Dirección del beneficiario', us: 'Beneficiary Address' },
      account: { local: 'Número de cuenta del beneficiario', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC/SWIFT del banco beneficiario', us: 'SWIFT / BIC Code' },
      amount: { local: 'Importe', us: 'Amount' },
      currency: { local: 'Divisa', us: 'Currency' },
      memo: { local: 'Concepto', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  PT: {
    lang: 'Portuguese',
    _source: 'research/raw/02-europe-west.md',
    labels: {
      beneficiaryName: { local: 'Beneficiário', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Morada do beneficiário', us: 'Beneficiary Address' },
      account: { local: 'Número de conta do beneficiário', us: 'Beneficiary Account Number',
        note: N.noIban },
      swift: { local: 'BIC/SWIFT do banco beneficiário', us: 'SWIFT / BIC Code' },
      amount: { local: 'Montante', us: 'Amount' },
      currency: { local: 'Moeda', us: 'Currency' },
      memo: { local: 'Descrição / motivo', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  BR: {
    lang: 'Portuguese',
    _source: 'research/raw/08-india-latam-ce.md — BCB RMCCI',
    labels: {
      beneficiaryName: { local: 'Beneficiário (nome completo)', us: 'Beneficiary Name',
        note: 'Full name, no initials or abbreviations.' },
      beneficiaryAddress: { local: 'Endereço do beneficiário', us: 'Beneficiary Address' },
      account: { local: 'Conta do beneficiário', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Código SWIFT', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Banco do beneficiário', us: 'Receiving Bank' },
      amount: { local: 'Valor', us: 'Amount' },
      currency: { local: 'Moeda', us: 'Currency' },
      memo: { local: 'Referência', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Encargos', us: 'Charges / Fee Instruction', note: N.charges, unverified: true },
    },
    extras: [
      { local: 'Contrato de câmbio', us: 'No U.S. equivalent',
        value: 'Required before the wire can be sent',
        note: 'Brazilian law requires every outbound FX transaction above a small de-minimis to '
            + 'be formalized in an FX contract with a BCB-authorized institution. This is a legal '
            + 'precondition, not a form field — start it early.' },
      { local: 'Natureza da operação / finalidade', us: 'Nature of the operation',
        value: 'Investimento em fundo no exterior (capital call)',
        note: 'Drives your IOF tax bracket and the BCB statistical classification. Getting it '
            + 'wrong changes what you pay.' },
    ],
  },

  MX: {
    lang: 'Spanish',
    _source: 'research/raw/08-india-latam-ce.md — BBVA Bancomer',
    labels: {
      beneficiaryName: { local: 'Nombre completo del beneficiario', us: 'Beneficiary Name',
        note: 'Mexican forms split surnames into apellido paterno and apellido materno. Interro '
            + 'is an entity, so enter the full legal name in the first field and leave the '
            + 'surname fields empty.' },
      beneficiaryAddress: { local: 'Domicilio completo del beneficiario', us: 'Beneficiary Address' },
      account: { local: 'Cuenta donde se realizará el abono', us: 'Beneficiary Account Number',
        note: 'The form offers IBAN or CLABE. Neither applies to a U.S. account — enter the plain '
            + 'account number.' },
      swift: { local: 'Código BIC/SWIFT', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Nombre del banco beneficiario', us: 'Receiving Bank' },
      bankAddress: { local: 'País, estado y ciudad del banco beneficiario', us: 'Bank Address',
        note: 'Mexican forms ask for bank country, state and city as separate fields.' },
      amount: { local: 'Monto', us: 'Amount' },
      currency: { local: 'Divisa', us: 'Currency' },
      memo: { local: 'Concepto', us: 'Wire Memo / Reference', note: N.memo, unverified: true },
    },
    extras: [],
  },

  /* ============================================================== Nordics === */

  SE: {
    lang: 'Swedish',
    _source: 'research/raw/03-nordics-cee.md',
    labels: {
      beneficiaryName: { local: 'Mottagarens namn', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Mottagarens adress', us: 'Beneficiary Address' },
      account: { local: 'Kontonummer', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'BIC/SWIFT', us: 'SWIFT / BIC Code' },
      amount: { local: 'Belopp', us: 'Amount' },
      currency: { local: 'Valuta', us: 'Currency' },
      memo: { local: 'Meddelande till mottagaren', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Betalningens syfte', us: 'Purpose of payment',
        value: 'Kapitalinsats i investeringsfond',
        note: 'Optional for most corridors, but supplying it prevents a compliance query.' },
    ],
  },

  NO: {
    lang: 'Norwegian',
    _source: 'research/raw/03-nordics-cee.md',
    labels: {
      beneficiaryName: { local: 'Mottakers navn', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Mottakers adresse', us: 'Beneficiary Address' },
      account: { local: 'Kontonummer', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      amount: { local: 'Beløp', us: 'Amount' },
      currency: { local: 'Valuta', us: 'Currency' },
      memo: { local: 'Melding til mottaker', us: 'Wire Memo / Reference',
        note: 'Use the free-text message field. Do NOT use the KID field — KID is for matching '
            + 'Norwegian domestic invoices and will not travel on an international wire.' },
    },
    extras: [],
  },

  DK: {
    lang: 'Danish',
    _source: 'research/raw/03-nordics-cee.md',
    labels: {
      beneficiaryName: { local: 'Modtagers navn', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Modtagers adresse', us: 'Beneficiary Address' },
      account: { local: 'Kontonummer', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      amount: { local: 'Beløb', us: 'Amount' },
      currency: { local: 'Valuta', us: 'Currency' },
      memo: { local: 'Besked til modtager', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },

  FI: {
    lang: 'Finnish',
    _source: 'research/raw/03-nordics-cee.md',
    labels: {
      beneficiaryName: { local: 'Saajan nimi', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Saajan osoite', us: 'Beneficiary Address' },
      account: { local: 'Tilinumero', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT/BIC', us: 'SWIFT / BIC Code' },
      amount: { local: 'Määrä', us: 'Amount' },
      currency: { local: 'Valuutta', us: 'Currency' },
      memo: { local: 'Viesti saajalle', us: 'Wire Memo / Reference',
        note: 'Use the free-text message field, not viitenumero. A Finnish viitenumero is '
            + 'numeric-only with a check digit and cannot carry an alphanumeric code.' },
    },
    extras: [],
  },

  /* ================================================================== Asia === */

  JP: {
    lang: 'Japanese',
    _source: 'research/raw/07-anglo-eastasia.md — MUFG, SMBC, Mizuho',
    labels: {
      beneficiaryName: { local: '受取人名 (Romaji)', us: 'Beneficiary Name', note: N.romanize },
      beneficiaryAddress: { local: '受取人住所', us: 'Beneficiary Address',
        note: 'Enter in English.' },
      account: { local: '口座番号', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFTコード (BIC)', us: 'SWIFT / BIC Code' },
      bankName: { local: '受取銀行名', us: 'Receiving Bank' },
      bankAddress: { local: '受取銀行住所', us: 'Bank Address' },
      bankCountry: { local: '受取銀行所在国', us: 'Bank Country' },
      amount: { local: '送金金額', us: 'Amount' },
      currency: { local: '通貨', us: 'Currency' },
      memo: { local: '受取人へのメッセージ', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: '送金目的', us: 'Purpose of remittance',
        value: 'Capital contribution to an investment fund',
        note: 'SMBC requires you to select and enter a remittance purpose.' },
      { local: '国際収支コード', us: 'Balance-of-payments code',
        value: 'Ask your bank for the outward capital-investment code',
        note: 'A specific BOP code must accompany the purpose. If no code matches your purpose, '
            + 'the online channel is blocked entirely and you must file a paper '
            + '外為送金依頼書 at a branch. Budget extra days.' },
      { local: 'マイナンバー / 法人番号', us: 'Individual or corporate tax ID',
        value: 'Required by law',
        note: 'MUFG: required for all international remittances under Japanese law.' },
      { local: '日本銀行への報告', us: 'Bank of Japan report',
        value: 'Applies above ¥30 million',
        note: 'Remittances over ¥30M trigger a separate BOJ report.' },
    ],
  },

  CN: {
    lang: 'Chinese (Simplified)',
    _source: 'research/raw/07-anglo-eastasia.md — Bank of China, SAFE',
    labels: {
      beneficiaryName: { local: '收款人姓名', us: 'Beneficiary Name', note: N.romanize },
      beneficiaryAddress: { local: '收款人地址', us: 'Beneficiary Address' },
      account: { local: '收款人账号', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: '收款银行SWIFT代码', us: 'SWIFT / BIC Code' },
      bankName: { local: '收款银行名称', us: 'Receiving Bank' },
      amount: { local: '汇款金额', us: 'Amount' },
      currency: { local: '币种', us: 'Currency' },
      memo: { local: '附言', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: '汇款用途', us: 'Purpose of remittance',
        value: 'Overseas investment — capital contribution',
        note: 'Bank of China requires the purpose to match the receiving country\'s regulatory '
            + 'categories. A mismatch triggers supplementary verification.' },
      { local: '证明文件 (合同/发票等)', us: 'Supporting documents',
        value: 'Capital call notice and fund subscription agreement',
        note: 'Whatever purpose you state, SAFE documentation rules require paperwork backing it.' },
      { local: '个人年度购汇额度', us: 'Annual FX quota',
        value: 'USD 50,000 per individual per year',
        note: 'Hard-capped at the counter. Exceeding it requires prior written SAFE approval — '
            + 'a capital call above this cannot be sent by an individual without it.' },
    ],
  },

  KR: {
    lang: 'Korean',
    _source: 'research/raw/04-apac.md — FETA',
    labels: {
      beneficiaryName: { local: '예금주', us: 'Beneficiary Name', note: N.romanize },
      beneficiaryAddress: { local: '수취인 주소', us: 'Beneficiary Address' },
      account: { local: '계좌번호', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT 코드', us: 'SWIFT / BIC Code' },
      bankName: { local: '은행명', us: 'Receiving Bank' },
      amount: { local: '송금액', us: 'Amount' },
      currency: { local: '통화', us: 'Currency' },
      memo: { local: '수취인 참조사항', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: '송금 사유', us: 'Purpose of remittance',
        value: 'Capital contribution to an investment fund',
        note: 'Declared on the bank\'s remittance application.' },
      { local: '증빙서류', us: 'Supporting documents',
        value: 'Capital call notice',
        note: 'Required once your cumulative outward remittances pass the FETA reporting '
            + 'threshold — roughly USD 100,000 per year.' },
      { local: '수취인 전화번호', us: 'Beneficiary phone number',
        value: 'Frequently requested',
        note: 'Korean banks often ask for this even though SWIFT does not require it.' },
    ],
  },

  IN: {
    lang: 'English / Hindi',
    _source: 'research/raw/08-india-latam-ce.md — RBI, ICICI/HDFC/SBI A2 forms',
    labels: {
      beneficiaryName: { local: 'Beneficiary Name', us: 'Beneficiary Name',
        note: 'Must match the beneficiary account record exactly.' },
      beneficiaryAddress: { local: 'Beneficiary Address / Beneficiary Country', us: 'Beneficiary Address',
        note: 'Indian forms split country into its own field. Truncated addresses stall the wire.' },
      account: { local: 'Beneficiary Account Number', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Beneficiary Bank SWIFT Code', us: 'SWIFT / BIC Code' },
      aba: { local: 'Routing Number', us: 'Routing Number (ABA / Fedwire)',
        note: 'Indian outward-remittance forms label this "only for USA" — this is that case.' },
      bankName: { local: 'Beneficiary Bank Name', us: 'Receiving Bank' },
      amount: { local: 'FCY Remittance Amount', us: 'Amount',
        note: 'Enter in both figures and words, as the form requires.' },
      currency: { local: 'Foreign Currency (FCY)', us: 'Currency', note: 'Tick USD.' },
      memo: { local: 'Payment Reference', us: 'Wire Memo / Reference', note: N.memo },
      charges: { local: 'Correspondent Bank charges to be borne by', us: 'Charges / Fee Instruction',
        note: 'Select OUR (Remitter). Indian forms often offer only OUR/BEN, with no SHA option.' },
    },
    extras: [
      { local: 'Purpose Code', us: 'No U.S. equivalent',
        value: 'S0001 — Indian investment abroad in equity capital (confirm with your bank)',
        note: 'A 5-character RBI code. The wrong code changes your Tax Collected at Source rate — '
            + 'potentially 20% instead of nil. Verify the current code against your bank\'s grid.' },
      { local: 'Form A2', us: 'No U.S. equivalent',
        value: 'Mandatory declaration',
        note: 'Ties the remittance to your PAN and KYC record. No outward wire proceeds without it.' },
      { local: 'LRS declaration', us: 'No U.S. equivalent',
        value: 'USD 250,000 per financial year',
        note: 'Resident individuals must self-declare the remittance is within the Liberalised '
            + 'Remittance Scheme cap, and log prior LRS use this year.' },
      { local: 'Source of Funds', us: 'Source of funds',
        value: 'Personal savings / business income — as applicable',
        note: 'A required tick-box on the A2 form.' },
    ],
  },

  ID: {
    lang: 'Indonesian',
    unverified: true,
    _source: 'research/raw/08-india-latam-ce.md — labels from help articles, not fetched forms',
    labels: {
      beneficiaryName: { local: 'Nama penerima', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Alamat lengkap penerima', us: 'Beneficiary Address' },
      account: { local: 'Nomor rekening penerima', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Kode SWIFT/BIC bank penerima', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Nama bank penerima', us: 'Receiving Bank' },
      amount: { local: 'Jumlah', us: 'Amount' },
      currency: { local: 'Mata uang', us: 'Currency' },
      memo: { local: 'Berita / keterangan', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Dokumen pendukung transaksi', us: 'Underlying transaction document',
        value: 'Capital call notice / subscription agreement',
        note: 'Bank Indonesia lowered the threshold requiring supporting documents for rupiah '
            + 'spot FX purchases from USD 25,000 to USD 10,000 per month, effective 1 July 2026.' },
    ],
  },

  TH: {
    lang: 'Thai',
    _source: 'research/raw/04-apac.md — Bank of Thailand',
    labels: {
      beneficiaryName: { local: 'ชื่อผู้รับโอน', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'ที่อยู่ผู้รับโอน', us: 'Beneficiary Address' },
      account: { local: 'เลขที่บัญชี', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'SWIFT ธนาคารผู้รับโอน', us: 'SWIFT / BIC Code' },
      bankName: { local: 'ธนาคารผู้รับโอน', us: 'Receiving Bank' },
      amount: { local: 'จำนวนเงิน', us: 'Amount' },
      currency: { local: 'สกุลเงิน', us: 'Currency' },
      memo: { local: 'รายละเอียดการโอน', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'วัตถุประสงค์การโอนเงิน', us: 'Purpose of transfer',
        value: 'Capital contribution to a named investment fund',
        note: 'Must be specific. Generic entries like "investment" or "personal funds" are '
            + 'rejected outright — name the fund and the capital call.' },
      { local: 'แบบฟอร์มธุรกรรมเงินตราต่างประเทศ (FET)', us: 'FX Transaction Form',
        value: 'Required above threshold',
        note: 'Threshold sources conflict (USD 20k vs 50k) — confirm with your bank.' },
    ],
  },

  MY: {
    lang: 'Malay',
    _source: 'research/raw/04-apac.md — BNM Foreign Exchange Administration',
    labels: {
      beneficiaryName: { local: 'Nama penerima', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'Alamat penerima', us: 'Beneficiary Address' },
      account: { local: 'Nombor akaun', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'Kod SWIFT bank penerima', us: 'SWIFT / BIC Code' },
      bankName: { local: 'Bank penerima', us: 'Receiving Bank' },
      amount: { local: 'Jumlah', us: 'Amount' },
      currency: { local: 'Mata wang', us: 'Currency' },
      memo: { local: 'Rujukan pembayaran', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'Kod Tujuan Pembayaran (POP)', us: 'No U.S. equivalent',
        value: 'Select the outward-investment code from your bank\'s dropdown',
        note: 'Genuinely mandatory under Bank Negara Malaysia\'s Foreign Exchange Administration '
            + 'framework, selected from a standardized list. The exact code table could not be '
            + 'extracted from source PDFs — confirm with your bank.' },
      { local: 'Dokumen sokongan', us: 'Supporting documents',
        value: 'Capital call notice',
        note: 'Requested for larger transfers to satisfy FEA rules.' },
    ],
  },

  /* ======================================================== Middle East === */

  AE: {
    lang: 'Arabic / English',
    _source: 'research/raw/05-mea.md — CBUAE Rulebook Article 4',
    labels: {
      beneficiaryName: { local: 'اسم المستفيد', us: 'Beneficiary Name' },
      beneficiaryAddress: { local: 'عنوان المستفيد', us: 'Beneficiary Address' },
      account: { local: 'رقم حساب المستفيد', us: 'Beneficiary Account Number',
        note: 'UAE forms ask for the beneficiary IBAN by default. The U.S. has no IBAN — enter '
            + 'the account number.' },
      swift: { local: 'اسم البنك المستفيد / SWIFT', us: 'SWIFT / BIC Code' },
      amount: { local: 'المبلغ', us: 'Amount' },
      currency: { local: 'العملة', us: 'Currency' },
      memo: { local: 'ملاحظات للمستفيد', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [
      { local: 'رمز الغرض من الدفع (Purpose of Payment Code)', us: 'No U.S. equivalent',
        value: 'Select the capital-investment code from your bank\'s list',
        note: 'Legally mandatory. CBUAE Rulebook Article 4 obliges institutions to capture a '
            + 'purpose-of-payment code on every cross-border transaction for balance-of-payments '
            + 'reporting. This is a central-bank mandate, not a bank preference. Applies to '
            + 'DIFC and ADGM entity accounts too.' },
    ],
  },

  IL: {
    lang: 'Hebrew',
    _source: 'research/raw/05-mea.md',
    labels: {
      beneficiaryName: { local: 'שם המקבל', us: 'Beneficiary Name', note: N.romanize },
      beneficiaryAddress: { local: 'כתובת המקבל', us: 'Beneficiary Address' },
      account: { local: 'מספר חשבון', us: 'Beneficiary Account Number', note: N.noIban },
      swift: { local: 'קוד SWIFT', us: 'SWIFT / BIC Code' },
      bankName: { local: 'בנק המקבל', us: 'Receiving Bank' },
      amount: { local: 'סכום', us: 'Amount' },
      currency: { local: 'מטבע', us: 'Currency' },
      memo: { local: 'הערות למקבל', us: 'Wire Memo / Reference', note: N.memo },
    },
    extras: [],
  },
};

/* Countries whose own regulator makes an outbound capital call materially harder
   than a form-filling exercise. Surfaced on the origin screen as a heads-up, so
   the investor learns it before they are staring at a rejected wire. */
window.WIRE_SEND_FRICTION = {
  CN: 'China caps individual outward FX at USD 50,000 per year. A larger capital call needs prior SAFE approval.',
  BR: 'Brazil requires a contrato de câmbio with an authorized institution before the wire can be sent.',
  IN: 'India requires Form A2 and an RBI purpose code, and applies Tax Collected at Source.',
  JP: 'Japan requires a balance-of-payments code. If none matches, the wire must be filed on paper at a branch.',
  ZA: 'South Africa requires a SARB balance-of-payments category code on every outward payment.',
  AE: 'The UAE central bank requires a purpose-of-payment code on every cross-border payment.',
  MY: 'Malaysia requires a Bank Negara purpose-of-payment code from a fixed list.',
  TH: 'Thailand rejects generic payment purposes. Name the fund and the capital call specifically.',
};
