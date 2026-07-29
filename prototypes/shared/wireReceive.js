/* =============================================================================
   Interro — WIRE_RECEIVE: what to collect from a DISTRIBUTION RECIPIENT

   SCOPE — the mirror image of wireFields.js. Read both notes together.

   The capital-call widget has a fixed U.S. beneficiary, so only the payer's
   VOCABULARY varies. Here the beneficiary is the person filling in the form, and
   their bank can be anywhere — including the United States, which is an entirely
   normal answer for a U.S. LP receiving a distribution into their U.S. account.
   So here the actual FIELD SET varies, and that is the whole point:

     • IBAN countries want an IBAN and no national code.
     • The U.S. wants ABA + account. Canada wants transit + institution + account.
       Australia wants BSB. India wants IFSC. Mexico wants a CLABE.
     • Some countries additionally require a tax ID (Brazil CPF/CNPJ, Chile RUT)
       or a regulator's purpose code before the money can be credited.

   Asking every recipient for every field would be both a worse experience and
   still wrong — an IBAN field shown to a Hong Kong recipient has no valid answer.
   Research verdict behind this design: research/raw/00-gating.md.

   FIELD SHAPE
     key        stable id, used as the form input name
     label      what the recipient sees
     us         plain-English gloss, shown as a subheader (their bank may use
                either term, and Interro ops reads the English one)
     req        'required' | 'conditional' | 'optional'
     type       'text' | 'code' | 'iban' | 'bic' | 'tel'  (drives input styling)
     hint       one line explaining where to find it
     pattern    RegExp source string, validated on blur and on submit
     invalid    the message shown when `pattern` fails
     placeholder

   Validation is deliberately format-only. Interro cannot verify that an account
   exists from a form — but it CAN stop a 21-character Swiss IBAN being submitted
   with 20 characters, which is the overwhelming majority of real failures.

   Sourcing: `_source` per country points at the research batch. IBAN lengths are
   from the SWIFT IBAN Registry via research/raw/01-audit.md, which corrected
   several v1 errors.
   ========================================================================== */

'use strict';

(function () {

  /* ------------------------------------------------------------- shared bits */

  /* FATF Recommendation 16 sets the floor for every corridor: a cross-border
     payment must carry the beneficiary's country and town at minimum. Interro
     collects a full street address because intermediary banks screen on it and
     a bare town name invites a compliance hold. */
  const NAME = {
    key: 'name', label: 'Full name on the account', us: 'Beneficiary name',
    req: 'required', type: 'text',
    hint: 'Exactly as your bank has it. A missing middle name is a common cause of rejection.',
    placeholder: 'e.g. Whitfield Family Office, LLC',
  };

  const STREET = {
    key: 'street', label: 'Street address', us: 'Address line',
    req: 'required', type: 'text',
    hint: 'A street address. P.O. boxes are rejected by most correspondent banks.',
    placeholder: '1200 Brickell Avenue, Suite 1800',
  };

  const CITY = {
    key: 'city', label: 'City / town', us: 'Town name',
    req: 'required', type: 'text', placeholder: 'Miami',
    hint: 'Required on every cross-border payment under FATF Recommendation 16.',
  };

  const POSTCODE = (label, us, hint, placeholder) => ({
    key: 'postcode', label, us, req: 'required', type: 'text', hint, placeholder,
  });

  const BIC = (example) => ({
    key: 'bic', label: 'SWIFT / BIC code', us: 'Bank identifier',
    req: 'required', type: 'bic',
    hint: '8 or 11 characters, from your bank. Not your account number.',
    pattern: '^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$',
    invalid: 'A BIC is 8 or 11 characters — six letters, then letters or digits.',
    placeholder: example,
  });

  const BANK_NAME = {
    key: 'bankName', label: 'Bank name', us: 'Receiving bank',
    req: 'required', type: 'text', placeholder: 'e.g. Deutsche Bank AG',
  };

  /* IBAN: two letters, two check digits, then the country's fixed remainder.
     Length is per-country and is the single most useful validation available —
     a wrong-length IBAN is caught here rather than by a correspondent bank. */
  const IBAN = (cc, len, example) => ({
    key: 'iban', label: 'IBAN', us: 'Account number (international format)',
    req: 'required', type: 'iban',
    hint: `${len} characters, starting ${cc}. Spaces are fine — Interro strips them.`,
    pattern: `^${cc}[0-9]{2}[A-Za-z0-9]{${len - 4}}$`,
    invalid: `A ${cc} IBAN is exactly ${len} characters including the ${cc} prefix.`,
    placeholder: example,
  });

  const ACCOUNT = (hint, pattern, invalid, placeholder) => ({
    key: 'account', label: 'Account number', us: 'Beneficiary account number',
    req: 'required', type: 'code', hint, pattern, invalid, placeholder,
  });

  /* Purpose of payment. Where a central bank mandates a coded value we say so
     plainly, because "optional" here means a returned wire. Interro knows the
     answer — it is always a fund distribution — so the field is pre-filled and
     the recipient only has to confirm it against their bank's list. */
  const PURPOSE = (authority, note) => ({
    key: 'purpose', label: 'Purpose of payment code', us: 'Reason for payment',
    req: 'required', type: 'text',
    hint: note || `Mandated by ${authority}. Ask your bank which code covers `
      + 'investment income or fund distributions.',
    placeholder: 'Investment income / fund distribution',
  });

  /* Most European IBAN countries collect an identical set. Declaring it once
     keeps the genuine per-country differences visible instead of buried in
     forty near-identical copies. */
  const sepaLike = (cc, len, example, bicExample, opts) => ({
    currency: (opts && opts.currency) || 'EUR',
    usesIban: true,
    _source: (opts && opts._source) || 'research/raw/02-europe-west.md',
    fields: [
      NAME,
      IBAN(cc, len, example),
      BIC(bicExample),
      BANK_NAME,
      STREET, CITY,
      POSTCODE('Postal code', 'ZIP code', null, (opts && opts.zip) || ''),
    ].concat((opts && opts.extra) || []),
    gotcha: opts && opts.gotcha,
  });

  /* --------------------------------------------------------------- the table */

  window.WIRE_RECEIVE = {

    /* ============================================== United States (no IBAN) ==
       A completely ordinary answer for a distribution recipient. The U.S. has no
       IBAN; routing is ABA + account. */
    US: {
      currency: 'USD',
      usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md; Fedwire ISO 20022 spec',
      fields: [
        NAME,
        {
          key: 'aba', label: 'Routing number (ABA)', us: 'ABA / Fedwire routing number',
          req: 'required', type: 'code',
          hint: 'Nine digits. On a check it is the leftmost number.',
          pattern: '^[0-9]{9}$',
          invalid: 'An ABA routing number is exactly 9 digits.',
          placeholder: '021000021',
        },
        ACCOUNT('Up to 17 characters.', '^[A-Za-z0-9]{4,17}$',
          'Enter 4 to 17 letters or digits, no spaces or dashes.', '4738291055 67'),
        {
          key: 'accountType', label: 'Account type', us: 'Checking or savings',
          req: 'required', type: 'select', options: ['Checking', 'Savings'],
          hint: 'Wires to the wrong account type can be returned.',
        },
        BANK_NAME,
        STREET, CITY,
        {
          key: 'state', label: 'State', us: 'State',
          req: 'required', type: 'text', placeholder: 'FL',
          hint: 'Two-letter state code — required in the structured address.',
        },
        POSTCODE('ZIP code', 'ZIP code', null, '33131'),
      ],
      gotcha: 'A U.S. recipient does not need a SWIFT/BIC — the ABA routing number '
        + 'is sufficient, and this is a domestic wire.',
    },

    /* ==================================================== IBAN — UK family ==
       Jersey, Guernsey and the Isle of Man all use GB-format IBANs. There is no
       JE or GG IBAN prefix. One validator covers all four. */
    GB: {
      currency: 'GBP',
      usesIban: true,
      _source: 'research/raw/07-anglo-eastasia.md; iban.com — GB structure',
      fields: [
        NAME,
        IBAN('GB', 22, 'GB29 NWBK 6016 1331 9268 19'),
        {
          key: 'sortCode', label: 'Sort code', us: 'Bank routing code',
          req: 'conditional', type: 'code',
          hint: 'Six digits. Already inside your IBAN, but some senders are asked for it separately.',
          pattern: '^[0-9]{6}$', invalid: 'A sort code is exactly 6 digits.',
          placeholder: '601613',
        },
        BIC('NWBKGB2L'), BANK_NAME, STREET, CITY,
        POSTCODE('Postcode', 'ZIP code',
          'UK postcodes are highly granular and often identify a single building.', 'SW1A 1AA'),
      ],
    },

    JE: {
      currency: 'GBP', usesIban: true,
      _source: 'research/raw/06-offshore-latam.md',
      fields: [
        NAME,
        IBAN('GB', 22, 'GB89 RBOS 1610 1234 5678 90'),
        BIC('RBOSJESX'), BANK_NAME, STREET, CITY, POSTCODE('Postcode', 'ZIP code', null, 'JE2 3RT'),
      ],
      gotcha: 'Jersey uses GB-format IBANs — there is no JE prefix. Your IBAN starts "GB".',
    },

    GG: {
      currency: 'GBP', usesIban: true,
      _source: 'research/raw/06-offshore-latam.md',
      fields: [
        NAME,
        IBAN('GB', 22, 'GB74 BARC 2049 8712 3456 78'),
        BIC('BARCGGSX'), BANK_NAME, STREET, CITY, POSTCODE('Postcode', 'ZIP code', null, 'GY1 2HL'),
      ],
      gotcha: 'Guernsey uses GB-format IBANs — there is no GG prefix. Your IBAN starts "GB".',
    },

    /* ======================================================= IBAN — Eurozone */
    DE: sepaLike('DE', 22, 'DE89 3704 0044 0532 0130 00', 'DEUTDEFF', { zip: '60311' }),
    FR: sepaLike('FR', 27, 'FR14 2004 1010 0505 0001 3M02 606', 'BNPAFRPP', { zip: '75008' }),
    IT: sepaLike('IT', 27, 'IT60 X054 2811 1010 0000 0123 456', 'UNCRITMM', { zip: '20121' }),
    ES: sepaLike('ES', 24, 'ES91 2100 0418 4502 0005 1332', 'CAIXESBB', { zip: '28001' }),
    NL: sepaLike('NL', 18, 'NL91 ABNA 0417 1643 00', 'ABNANL2A', { zip: '1017 CG' }),
    BE: sepaLike('BE', 16, 'BE68 5390 0754 7034', 'GEBABEBB', { zip: '1000' }),
    AT: sepaLike('AT', 20, 'AT61 1904 3002 3457 3201', 'BKAUATWW', { zip: '1010' }),
    IE: sepaLike('IE', 22, 'IE29 AIBK 9311 5212 3456 78', 'AIBKIE2D', { zip: 'D02 XY45' }),
    PT: sepaLike('PT', 25, 'PT50 0002 0123 1234 5678 9015 4', 'BCOMPTPL', { zip: '1250-096' }),

    LU: sepaLike('LU', 20, 'LU28 0019 4006 4475 0000', 'BILLLULL', {
      zip: 'L-1855',
      extra: [{
        key: 'fundRef', label: 'Investor or account reference', us: 'Reference',
        req: 'conditional', type: 'text',
        hint: 'If your account is held through a fund administrator or custodian, give the '
          + 'reference they issued you.',
        placeholder: 'e.g. SUB-40192',
      }],
      gotcha: 'Luxembourg fund money often moves through omnibus and custodian accounts, so the '
        + 'reference is what ties a payment to you. Supply it if you have one.',
    }),

    /* ========================================================= IBAN — other */
    CH: sepaLike('CH', 21, 'CH93 0076 2011 6238 5295 7', 'UBSWCHZH80A', {
      currency: 'CHF', _source: 'research/raw/08-india-latam-ce.md; SIX Group',
      zip: '8001',
    }),
    SE: sepaLike('SE', 24, 'SE45 5000 0000 0583 9825 7466', 'SWEDSESS', {
      currency: 'SEK', _source: 'research/raw/03-nordics-cee.md', zip: '111 57',
      gotcha: 'A Bankgiro or Plusgiro number cannot receive an international wire. Interro needs '
        + 'your IBAN.',
    }),
    NO: sepaLike('NO', 15, 'NO93 8601 1117 947', 'DNBANOKK', {
      currency: 'NOK', _source: 'research/raw/03-nordics-cee.md', zip: '0150',
      gotcha: 'Do not supply a KID number — KID matches Norwegian domestic invoices and does not '
        + 'travel on an international wire.',
    }),
    DK: sepaLike('DK', 18, 'DK50 0040 0440 1162 43', 'DABADKKK', {
      currency: 'DKK', _source: 'research/raw/03-nordics-cee.md', zip: '1050',
    }),
    FI: sepaLike('FI', 18, 'FI21 1234 5600 0007 85', 'NDEAFIHH', {
      currency: 'EUR', _source: 'research/raw/03-nordics-cee.md', zip: '00100',
    }),
    IL: sepaLike('IL', 23, 'IL62 0108 0000 0009 9999 999', 'POALILIT', {
      currency: 'ILS', _source: 'research/raw/05-mea.md', zip: '6120101',
    }),

    AE: sepaLike('AE', 23, 'AE07 0331 2345 6789 0123 456', 'EBILAEAD', {
      currency: 'AED', _source: 'research/raw/05-mea.md — CBUAE Rulebook Art. 4',
      zip: '',
      extra: [PURPOSE('the UAE central bank',
        'Legally mandatory. CBUAE Rulebook Article 4 requires a purpose-of-payment code on '
        + 'every cross-border payment. Ask your bank which code covers fund distributions.')],
      gotcha: 'The purpose-of-payment code is a central-bank requirement, not a formality — it '
        + 'applies to DIFC and ADGM accounts too.',
    }),

    /* =========================================== Non-IBAN — Commonwealth ==== */
    CA: {
      currency: 'CAD', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md — RBC, TD',
      fields: [
        NAME,
        {
          key: 'institution', label: 'Institution number', us: 'Bank identifier',
          req: 'required', type: 'code', hint: 'Three digits — 003 is RBC, 004 is TD.',
          pattern: '^[0-9]{3}$', invalid: 'An institution number is exactly 3 digits.',
          placeholder: '003',
        },
        {
          key: 'transit', label: 'Transit number', us: 'Branch routing number',
          req: 'required', type: 'code', hint: 'Five digits, identifying your branch.',
          pattern: '^[0-9]{5}$', invalid: 'A transit number is exactly 5 digits.',
          placeholder: '00002',
        },
        ACCOUNT('Typically 7 to 12 digits.', '^[0-9]{7,12}$',
          'Canadian account numbers are 7 to 12 digits.', '1234567'),
        BIC('ROYCCAT2'), BANK_NAME, STREET, CITY,
        {
          key: 'province', label: 'Province', us: 'State',
          req: 'required', type: 'text', placeholder: 'ON',
          hint: 'Two-letter province code — required as an ISO code.',
        },
        POSTCODE('Postal code', 'ZIP code', 'Format A1A 1A1.', 'M5J 2J5'),
      ],
      gotcha: 'P.O. boxes are refused outright for Canadian wires under anti-terrorist-financing '
        + 'rules. The only exceptions are Indigenous and military addresses.',
    },

    AU: {
      currency: 'AUD', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md — CommBank, Westpac',
      fields: [
        NAME,
        {
          key: 'bsb', label: 'BSB number', us: 'Routing number',
          req: 'required', type: 'code',
          hint: 'Six digits — Bank-State-Branch. Often written 123-456.',
          pattern: '^[0-9]{6}$', invalid: 'A BSB is exactly 6 digits.',
          placeholder: '062000',
        },
        ACCOUNT('Usually 4 to 10 digits, depending on your bank.', '^[0-9]{4,10}$',
          'Australian account numbers are 4 to 10 digits.', '12345678'),
        BIC('CTBAAU2S'), BANK_NAME, STREET, CITY,
        {
          key: 'state', label: 'State / territory', us: 'State',
          req: 'required', type: 'text', placeholder: 'NSW',
          hint: 'e.g. NSW, VIC, QLD.',
        },
        POSTCODE('Postcode', 'ZIP code', 'Four digits.', '2000'),
      ],
      gotcha: 'CommBank rejects P.O. box beneficiary addresses. Give a street address.',
    },

    NZ: {
      currency: 'NZD', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md — ANZ NZ',
      fields: [
        NAME,
        ACCOUNT('15 or 16 digits: 2-digit bank, 4-digit branch, 7-digit account, 2–3 digit suffix. '
          + 'Keep any leading zeros.', '^[0-9]{15,16}$',
          'A New Zealand account number is 15 or 16 digits.', '01 0102 0123456 000'),
        BIC('ANZBNZ22'), BANK_NAME, STREET, CITY,
        POSTCODE('Postcode', 'ZIP code', 'Four digits.', '1010'),
      ],
      gotcha: 'New Zealand does not use IBAN at all. Leading zeros in your account number matter — '
        + 'do not drop them.',
    },

    ZA: {
      currency: 'ZAR', usesIban: false,
      _source: 'research/raw/05-mea.md — SARB Financial Surveillance',
      fields: [
        NAME,
        {
          key: 'branch', label: 'Branch code', us: 'Routing number',
          req: 'required', type: 'code',
          hint: 'Six digits. Most banks publish one universal code — Standard Bank is 051001.',
          pattern: '^[0-9]{6}$', invalid: 'A South African branch code is exactly 6 digits.',
          placeholder: '051001',
        },
        ACCOUNT('Length varies by bank.', '^[0-9]{6,13}$',
          'Enter 6 to 13 digits.', '1234567890'),
        BIC('SBZAZAJJ'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', null, '2196'),
        {
          key: 'purpose', label: 'What is this payment for?', us: 'Purpose of payment',
          req: 'required', type: 'text',
          hint: 'Your bank converts this into a SARB balance-of-payments category code. Plain '
            + 'words are what it needs, not a code.',
          placeholder: 'Distribution from an investment fund',
        },
      ],
      gotcha: 'South Africa requires a balance-of-payments category on every inbound payment, but '
        + 'YOUR bank assigns the code — you only need to describe the payment accurately.',
    },

    /* ================================================== Non-IBAN — East Asia */
    JP: {
      currency: 'JPY', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md — Zengin',
      fields: [
        { ...NAME, label: 'Full name on the account (Romaji)',
          hint: 'In Latin characters, matching your bank record. Japanese script cannot travel on '
            + 'a SWIFT wire.' },
        {
          key: 'bankCode', label: 'Bank code (銀行コード)', us: 'Bank identifier',
          req: 'required', type: 'code', hint: 'Four digits.',
          pattern: '^[0-9]{4}$', invalid: 'A Japanese bank code is exactly 4 digits.',
          placeholder: '0005',
        },
        {
          key: 'branchCode', label: 'Branch code (支店番号)', us: 'Branch routing number',
          req: 'required', type: 'code', hint: 'Three digits.',
          pattern: '^[0-9]{3}$', invalid: 'A Japanese branch code is exactly 3 digits.',
          placeholder: '001',
        },
        ACCOUNT('Commonly 7 digits.', '^[0-9]{6,8}$',
          'Enter 6 to 8 digits.', '1234567'),
        BIC('BOTKJPJT'), BANK_NAME,
        { ...STREET, hint: 'In English. P.O. boxes are not accepted.' },
        CITY,
        {
          key: 'prefecture', label: 'Prefecture', us: 'State',
          req: 'required', type: 'text', placeholder: 'Tokyo',
        },
        POSTCODE('Postal code', 'ZIP code', 'Format 123-4567.', '100-0001'),
      ],
      gotcha: 'Your name must be in Romaji and match the bank record exactly — this is the most '
        + 'common cause of returned wires to Japan.',
    },

    HK: {
      currency: 'HKD', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md',
      fields: [
        NAME,
        {
          key: 'bankCode', label: 'Bank code', us: 'Bank identifier',
          req: 'required', type: 'code', hint: 'Three digits.',
          pattern: '^[0-9]{3}$', invalid: 'A Hong Kong bank code is exactly 3 digits.',
          placeholder: '004',
        },
        {
          key: 'branchCode', label: 'Branch code', us: 'Branch routing number',
          req: 'required', type: 'code', hint: 'Three digits.',
          pattern: '^[0-9]{3}$', invalid: 'A Hong Kong branch code is exactly 3 digits.',
          placeholder: '802',
        },
        ACCOUNT('Typically 6 to 9 digits.', '^[0-9]{6,9}$',
          'Enter 6 to 9 digits.', '123456789'),
        BIC('HSBCHKHH'), BANK_NAME, STREET,
        { ...CITY, label: 'District', us: 'Town name', placeholder: 'Central' },
        {
          key: 'region', label: 'Region', us: 'State',
          req: 'required', type: 'select',
          options: ['Hong Kong Island', 'Kowloon', 'New Territories'],
        },
      ],
      gotcha: 'Hong Kong has no postal codes — there is no ZIP field to fill in, and that is '
        + 'expected. Ask your bank to register the sender as a Telegraphic Transfer payee if '
        + 'the wire is delayed.',
    },

    CN: {
      currency: 'CNY', usesIban: false,
      _source: 'research/raw/07-anglo-eastasia.md; audit — CNAPS structure',
      fields: [
        { ...NAME, hint: 'In Latin characters for the SWIFT message, matching your account record '
            + 'exactly as held at the account-opening bank.' },
        {
          key: 'cnaps', label: 'CNAPS code', us: 'Bank routing code',
          req: 'required', type: 'code',
          hint: '12 digits: 3 bank, 4 city, 4 branch, 1 check. Separate from your account number.',
          pattern: '^[0-9]{12}$', invalid: 'A CNAPS code is exactly 12 digits.',
          placeholder: '104100000004',
        },
        ACCOUNT('Commonly 16 to 19 digits.', '^[0-9]{10,19}$',
          'Enter 10 to 19 digits.', '6222021234567890'),
        BIC('BKCHCNBJ'), BANK_NAME, STREET, CITY,
        {
          key: 'province', label: 'Province / municipality', us: 'State',
          req: 'required', type: 'text', placeholder: 'Shanghai',
        },
        POSTCODE('Postal code', 'ZIP code', null, '200120'),
        PURPOSE('the State Administration of Foreign Exchange (SAFE)',
          'Chinese banks require a stated purpose to credit an inbound wire, and may ask you for '
          + 'the distribution notice as supporting documentation.'),
      ],
      gotcha: 'Inbound foreign currency is subject to SAFE controls. Your bank may hold the funds '
        + 'until you provide the distribution notice.',
    },

    KR: {
      currency: 'KRW', usesIban: false,
      _source: 'research/raw/04-apac.md — FETA',
      fields: [
        { ...NAME, hint: 'In Latin characters, matching your bank record exactly.' },
        ACCOUNT('Length varies by bank.', '^[0-9-]{10,16}$',
          'Enter 10 to 16 digits (dashes allowed).', '123-456789-01234'),
        BIC('HVBKKRSE'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', null, '06236'),
        {
          key: 'phone', label: 'Phone number', us: 'Contact number',
          req: 'conditional', type: 'tel',
          hint: 'Korean banks frequently ask for this on inbound foreign remittances.',
          placeholder: '+82 2 1234 5678',
        },
      ],
      gotcha: 'Once your inbound remittances pass roughly USD 100,000 in a year, Korean FX rules '
        + 'require supporting documentation. Keep the distribution notice.',
    },

    SG: {
      currency: 'SGD', usesIban: false,
      _source: 'research/raw/04-apac.md — MAS Notice 626',
      fields: [
        NAME,
        {
          key: 'bankCode', label: 'Bank code', us: 'Bank identifier',
          req: 'conditional', type: 'code',
          hint: 'Some banks still use a bank and branch code; DBS, OCBC and UOB route on BIC alone.',
          pattern: '^[0-9]{4}$', invalid: 'A Singapore bank code is 4 digits.',
          placeholder: '7171',
        },
        ACCOUNT('Typically 9 to 11 digits.', '^[0-9]{7,12}$',
          'Enter 7 to 12 digits.', '1234567890'),
        BIC('DBSSSGSG'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', 'Six digits.', '018956'),
      ],
      gotcha: 'If your account belongs to a VCC sub-fund, the name must match the sub-fund as '
        + 'registered with its own UEN — not the umbrella VCC.',
    },

    TH: {
      currency: 'THB', usesIban: false,
      _source: 'research/raw/04-apac.md — Bank of Thailand',
      fields: [
        NAME,
        ACCOUNT('Usually 10 digits.', '^[0-9]{10,15}$',
          'Enter 10 to 15 digits.', '1234567890'),
        BIC('BKKBTHBK'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', null, '10330'),
        {
          key: 'purpose', label: 'Purpose of the payment', us: 'Reason for payment',
          req: 'required', type: 'text',
          hint: 'Be specific. Thai banks reject generic wording like "investment" or '
            + '"personal funds" — name the fund.',
          placeholder: 'Distribution from Meridian Growth Partners III',
        },
      ],
      gotcha: 'Converting the inbound funds to baht above a threshold requires a Foreign Exchange '
        + 'Transaction form. Sources disagree on the threshold — confirm with your bank.',
    },

    MY: {
      currency: 'MYR', usesIban: false,
      _source: 'research/raw/04-apac.md — BNM Foreign Exchange Administration',
      fields: [
        NAME,
        ACCOUNT('Length varies by bank.', '^[0-9]{10,17}$',
          'Enter 10 to 17 digits.', '1234567890123'),
        BIC('MBBEMYKL'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', 'Five digits.', '50450'),
        PURPOSE('Bank Negara Malaysia',
          'Bank Negara mandates a purpose-of-payment code from a fixed list. Ask your bank which '
          + 'code covers investment income or fund distributions.'),
      ],
      gotcha: 'The purpose-of-payment code is genuinely mandatory in Malaysia, not advisory.',
    },

    PH: {
      currency: 'PHP', usesIban: false,
      _source: 'research/raw/04-apac.md — BSP',
      fields: [
        NAME,
        ACCOUNT('Length varies by bank.', '^[0-9-]{10,19}$',
          'Enter 10 to 19 digits (dashes allowed).', '1234567890'),
        BIC('BOPIPHMM'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', 'Four digits.', '1226'),
        {
          key: 'purpose', label: 'Purpose of the payment', us: 'Reason for payment',
          req: 'required', type: 'text',
          hint: 'The BSP requires specific wording. "Transfer" or "payment" alone is rejected.',
          placeholder: 'Distribution from an investment fund',
        },
      ],
    },

    ID: {
      currency: 'IDR', usesIban: false,
      _source: 'research/raw/08-india-latam-ce.md',
      fields: [
        NAME,
        ACCOUNT('Commonly 10 to 18 digits, bank-specific.', '^[0-9]{7,18}$',
          'Enter 7 to 18 digits.', '1234567890'),
        BIC('CENAIDJA'), BANK_NAME, STREET, CITY,
        POSTCODE('Postal code', 'ZIP code', 'Five digits.', '12190'),
      ],
      gotcha: 'Bank Indonesia requires supporting documents for rupiah conversions above USD '
        + '10,000 per month, lowered from USD 25,000 effective 1 July 2026. Keep the '
        + 'distribution notice.',
    },

    IN: {
      currency: 'INR', usesIban: false,
      _source: 'research/raw/08-india-latam-ce.md — RBI',
      fields: [
        { ...NAME, hint: 'Must match your bank account AND your PAN record. A missing middle name '
            + 'will trigger a compliance hold.' },
        {
          key: 'ifsc', label: 'IFSC code', us: 'Bank routing code',
          req: 'required', type: 'code',
          hint: '11 characters: 4 letters, a zero, then 6 characters identifying the branch.',
          pattern: '^[A-Za-z]{4}0[A-Za-z0-9]{6}$',
          invalid: 'An IFSC is 11 characters — four letters, a 0, then six more.',
          placeholder: 'HDFC0001234',
        },
        ACCOUNT('Length varies by bank, roughly 9 to 18 digits.', '^[0-9]{9,18}$',
          'Enter 9 to 18 digits.', '50100123456789'),
        BIC('HDFCINBB'), BANK_NAME, STREET, CITY,
        {
          key: 'state', label: 'State / union territory', us: 'State',
          req: 'required', type: 'text', placeholder: 'Maharashtra',
        },
        POSTCODE('PIN code', 'ZIP code', 'Six digits.', '400051'),
      ],
      gotcha: 'India has no fixed account-number length — do not pad or truncate yours. The IFSC '
        + 'is the fixed 11-character field, and the two are often confused.',
    },

    /* ================================================ Non-IBAN — Americas == */
    MX: {
      currency: 'MXN', usesIban: false,
      _source: 'research/raw/08-india-latam-ce.md; audit — CLABE structure',
      fields: [
        NAME,
        {
          key: 'clabe', label: 'CLABE', us: 'Routing + account number combined',
          req: 'required', type: 'code',
          hint: '18 digits: 3 bank, 3 branch, 11 account, 1 check digit. Replaces both the '
            + 'routing and account number.',
          pattern: '^[0-9]{18}$', invalid: 'A CLABE is exactly 18 digits.',
          placeholder: '002010077777777771',
        },
        BIC('BCMRMXMM'), BANK_NAME, STREET, CITY,
        {
          key: 'state', label: 'Estado', us: 'State',
          req: 'required', type: 'text', placeholder: 'Ciudad de México',
        },
        POSTCODE('Código postal', 'ZIP code', 'Five digits.', '11000'),
      ],
      gotcha: 'Give the CLABE, not your card or short account number — an 18-digit CLABE is the '
        + 'only identifier that routes an inbound wire reliably.',
    },

    BR: {
      currency: 'BRL', usesIban: false,
      _source: 'research/raw/08-india-latam-ce.md — BCB',
      fields: [
        { ...NAME, hint: 'Full legal name, no initials or abbreviations.' },
        {
          key: 'agencia', label: 'Agência', us: 'Branch number',
          req: 'required', type: 'code', hint: 'Four digits, sometimes with a check digit.',
          pattern: '^[0-9]{4}(-?[0-9Xx])?$', invalid: 'An agência is 4 digits, optionally with a check digit.',
          placeholder: '1234',
        },
        ACCOUNT('Your conta corrente number, including its check digit.', '^[0-9]{4,13}(-?[0-9Xx])?$',
          'Enter your account number with its check digit.', '12345678-9'),
        {
          key: 'taxId', label: 'CPF or CNPJ', us: 'Tax identification number',
          req: 'required', type: 'code',
          hint: 'CPF (11 digits) if you are an individual, CNPJ (14 digits) for a company.',
          pattern: '^([0-9]{11}|[0-9]{14})$',
          invalid: 'A CPF is 11 digits; a CNPJ is 14. Enter digits only.',
          placeholder: '12345678901',
        },
        BIC('BRASBRRJ'), BANK_NAME, STREET, CITY,
        {
          key: 'state', label: 'Estado', us: 'State',
          req: 'required', type: 'text', placeholder: 'SP',
          hint: 'Two-letter state abbreviation.',
        },
        POSTCODE('CEP', 'ZIP code', 'Format 01310-100.', '01310-100'),
        {
          key: 'phone', label: 'Phone number', us: 'Contact number',
          req: 'conditional', type: 'tel',
          hint: 'Brazilian receiving banks frequently require this to release funds.',
          placeholder: '+55 11 91234 5678',
        },
      ],
      gotcha: 'The CPF or CNPJ is not optional in Brazil — an inbound wire without a matching tax '
        + 'ID will not be credited.',
    },

    /* ============================================= Non-IBAN — offshore ===== */
    KY: {
      currency: 'USD', usesIban: false,
      _source: 'research/raw/06-offshore-latam.md',
      fields: [
        NAME,
        ACCOUNT('As issued by your Cayman bank.', '^[A-Za-z0-9-]{5,20}$',
          'Enter 5 to 20 letters, digits or dashes.', '1234567890'),
        BIC('BOFCKYKY'), BANK_NAME, STREET,
        { ...CITY, placeholder: 'George Town' },
        POSTCODE('Postal code', 'ZIP code', 'Cayman postal codes look like KY1-1104.', 'KY1-1104'),
      ],
      gotcha: 'The Cayman Islands do not use IBAN — an account number plus SWIFT/BIC is correct '
        + 'and complete. A registered-office address at a corporate service provider is normally '
        + 'accepted for fund vehicles, unlike a P.O. box.',
    },

    BM: {
      currency: 'USD', usesIban: false,
      _source: 'research/raw/06-offshore-latam.md — HSBC Bermuda',
      fields: [
        NAME,
        ACCOUNT('As issued by your Bermuda bank.', '^[A-Za-z0-9-]{5,20}$',
          'Enter 5 to 20 letters, digits or dashes.', '1234567890'),
        BIC('BNTBBMHM'), BANK_NAME, STREET,
        { ...CITY, placeholder: 'Hamilton' },
        POSTCODE('Postal code', 'ZIP code', 'Bermuda postal codes look like HM 08.', 'HM 08'),
      ],
      gotcha: 'Bermuda does not use IBAN. The Bermuda dollar is pegged 1:1 to the US dollar, so a '
        + 'USD distribution arrives with minimal FX friction.',
    },

    VG: {
      currency: 'USD', usesIban: false,
      _source: 'research/raw/06-offshore-latam.md — thin sourcing, flagged',
      fields: [
        NAME,
        ACCOUNT('As issued by your bank.', '^[A-Za-z0-9-]{5,20}$',
          'Enter 5 to 20 letters, digits or dashes.', '1234567890'),
        BIC('FCIBVGSJ'), BANK_NAME, STREET,
        { ...CITY, placeholder: 'Road Town' },
      ],
      gotcha: 'The BVI has very little local banking. If your entity is BVI-registered but banks '
        + 'in Cayman, Singapore or elsewhere, go back and select the country your BANK is in — '
        + 'not where the entity is incorporated.',
    },
  };

  /* The picker offers the full KYC country list. Anything without a schema falls
     back to a generic international form — honest, and still collects the FATF
     minimum — rather than blocking the recipient. */
  window.WIRE_RECEIVE_FALLBACK = {
    currency: 'USD',
    usesIban: false,
    generic: true,
    fields: [
      NAME,
      {
        key: 'ibanOrAccount', label: 'IBAN or account number', us: 'Account identifier',
        req: 'required', type: 'code',
        hint: 'Give your IBAN if your country uses one; otherwise your account number.',
        placeholder: '',
      },
      BIC(''),
      BANK_NAME, STREET, CITY,
      POSTCODE('Postal code', 'ZIP code', null, ''),
      {
        key: 'nationalCode', label: 'National bank or branch code', us: 'Routing number',
        req: 'optional', type: 'code',
        hint: 'If your country uses one — a sort code, BSB, IFSC or similar.',
        placeholder: '',
      },
    ],
    gotcha: 'Interro has not yet verified the exact field requirements for this country, so this '
      + 'is a general form. Someone from Interro may follow up to confirm details before sending.',
  };

  window.receiveSchema = (code) =>
    window.WIRE_RECEIVE[code] || window.WIRE_RECEIVE_FALLBACK;
})();
