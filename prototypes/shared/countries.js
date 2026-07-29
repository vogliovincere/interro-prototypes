/* =============================================================================
   Interro — shared country list for wire prototypes

   Mirrored verbatim from the Embedded KYC UI so the two products offer the
   investor an identical set of jurisdictions and identical ordering:
     Embeddable-UI/app-embedded/src/data/countries.js

   Ordering is deliberate and NOT alphabetical — it is the KYC UI's
   likelihood-of-use order (US/UK/CA/AU, then core Europe, then the offshore
   fund domiciles, then the rest). The picker exposes a search box, so the
   ordering only has to serve the common case.

   Flags: the KYC UI uses flag emoji. Windows has no country-flag glyphs, so
   Chrome on Windows renders them as bare regional-indicator letters — which
   reads as a rendering fault inside an otherwise finished widget. This file
   therefore keeps the emoji (for parity, and for correct rendering on macOS /
   iOS / Android hosts) but the prototypes render `code` in a chip instead.
   ========================================================================== */

'use strict';

window.COUNTRIES = [
  { code: 'US', name: 'United States of America', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'DE', name: 'Germany', flag: '\u{1F1E9}\u{1F1EA}' },
  { code: 'FR', name: 'France', flag: '\u{1F1EB}\u{1F1F7}' },
  { code: 'JP', name: 'Japan', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'CH', name: 'Switzerland', flag: '\u{1F1E8}\u{1F1ED}' },
  { code: 'SG', name: 'Singapore', flag: '\u{1F1F8}\u{1F1EC}' },
  { code: 'HK', name: 'Hong Kong', flag: '\u{1F1ED}\u{1F1F0}' },
  { code: 'IE', name: 'Ireland', flag: '\u{1F1EE}\u{1F1EA}' },
  { code: 'NL', name: 'Netherlands', flag: '\u{1F1F3}\u{1F1F1}' },
  { code: 'LU', name: 'Luxembourg', flag: '\u{1F1F1}\u{1F1FA}' },
  { code: 'KY', name: 'Cayman Islands', flag: '\u{1F1F0}\u{1F1FE}' },
  { code: 'BM', name: 'Bermuda', flag: '\u{1F1E7}\u{1F1F2}' },
  { code: 'VG', name: 'British Virgin Islands', flag: '\u{1F1FB}\u{1F1EC}' },
  { code: 'JE', name: 'Jersey', flag: '\u{1F1EF}\u{1F1EA}' },
  { code: 'GG', name: 'Guernsey', flag: '\u{1F1EC}\u{1F1EC}' },
  { code: 'NZ', name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}' },
  { code: 'SE', name: 'Sweden', flag: '\u{1F1F8}\u{1F1EA}' },
  { code: 'NO', name: 'Norway', flag: '\u{1F1F3}\u{1F1F4}' },
  { code: 'DK', name: 'Denmark', flag: '\u{1F1E9}\u{1F1F0}' },
  { code: 'FI', name: 'Finland', flag: '\u{1F1EB}\u{1F1EE}' },
  { code: 'IT', name: 'Italy', flag: '\u{1F1EE}\u{1F1F9}' },
  { code: 'ES', name: 'Spain', flag: '\u{1F1EA}\u{1F1F8}' },
  { code: 'PT', name: 'Portugal', flag: '\u{1F1F5}\u{1F1F9}' },
  { code: 'AT', name: 'Austria', flag: '\u{1F1E6}\u{1F1F9}' },
  { code: 'BE', name: 'Belgium', flag: '\u{1F1E7}\u{1F1EA}' },
  { code: 'IL', name: 'Israel', flag: '\u{1F1EE}\u{1F1F1}' },
  { code: 'AE', name: 'United Arab Emirates', flag: '\u{1F1E6}\u{1F1EA}' },
  { code: 'IN', name: 'India', flag: '\u{1F1EE}\u{1F1F3}' },
  { code: 'CN', name: 'China', flag: '\u{1F1E8}\u{1F1F3}' },
  { code: 'KR', name: 'South Korea', flag: '\u{1F1F0}\u{1F1F7}' },
  { code: 'BR', name: 'Brazil', flag: '\u{1F1E7}\u{1F1F7}' },
  { code: 'MX', name: 'Mexico', flag: '\u{1F1F2}\u{1F1FD}' },
  { code: 'ZA', name: 'South Africa', flag: '\u{1F1FF}\u{1F1E6}' },
  { code: 'PH', name: 'Philippines', flag: '\u{1F1F5}\u{1F1ED}' },
  { code: 'TH', name: 'Thailand', flag: '\u{1F1F9}\u{1F1ED}' },
  { code: 'MY', name: 'Malaysia', flag: '\u{1F1F2}\u{1F1FE}' },
  { code: 'ID', name: 'Indonesia', flag: '\u{1F1EE}\u{1F1E9}' },
];

window.countryByCode = (code) => window.COUNTRIES.find((c) => c.code === code) || null;
