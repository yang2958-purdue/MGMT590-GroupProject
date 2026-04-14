/**
 * USPS state / territory abbreviations ↔ display names for dropdown matching.
 * Mirrors resume location parsing (see resumeParser.js).
 */

const US_STATE_FULL_TO_ABBR = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'puerto rico': 'PR',
  guam: 'GU',
  'american samoa': 'AS',
  'virgin islands': 'VI',
  'northern mariana islands': 'MP',
};

/**
 * @param {string} abbr - Two-letter USPS code (e.g. IL)
 * @returns {string} Title-case full name (e.g. Illinois), or '' if unknown
 */
export function abbrToFullStateName(abbr) {
  const a = String(abbr || '').trim().toUpperCase();
  if (a.length !== 2) return '';
  for (const [fullKey, code] of Object.entries(US_STATE_FULL_TO_ABBR)) {
    if (code === a) {
      return fullKey
        .split(' ')
        .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
        .join(' ');
    }
  }
  return '';
}
