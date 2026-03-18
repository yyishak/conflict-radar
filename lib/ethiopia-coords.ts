/**
 * Ethiopian + Horn of Africa coordinate resolver.
 *
 * When a news/GDELT/NYT event has a text `location` but no lat/lng, this
 * returns the centroid of the best matching region so the event still
 * appears on the 3D globe with the correct approximate position.
 *
 * Matching is keyword-based (case-insensitive substring search) so
 * "Addis Ababa, Ethiopia" → matches "addis ababa" → 9.03, 38.74.
 */

interface Coords { lat: number; lng: number }

// ── Ethiopia administrative regions ──────────────────────────────────────────
// ── Major cities ──────────────────────────────────────────────────────────────
// ── Horn-of-Africa neighbours ─────────────────────────────────────────────────
// Order matters: more specific keywords first, fallbacks at bottom.
const LOOKUP: Array<[string[], Coords]> = [
  // ── Addis Ababa (capital, most common) ──────────────────────────────────────
  [['addis ababa', 'addis', 'finfinne'],          { lat: 9.03,  lng: 38.74 }],

  // ── Tigray region + major cities ────────────────────────────────────────────
  [['mekelle', 'mekele'],                          { lat: 13.50, lng: 39.48 }],
  [['axum', 'aksum'],                              { lat: 14.13, lng: 38.73 }],
  [['adwa', 'adua'],                               { lat: 14.17, lng: 38.90 }],
  [['shire'],                                      { lat: 14.10, lng: 38.28 }],
  [['tigray', 'tigrai'],                           { lat: 13.80, lng: 39.20 }],

  // ── Amhara region + cities ───────────────────────────────────────────────────
  [['bahir dar', 'bahar dar'],                     { lat: 11.59, lng: 37.39 }],
  [['gondar', 'gonder'],                           { lat: 12.61, lng: 37.47 }],
  [['dessie', 'desse'],                            { lat: 11.13, lng: 39.63 }],
  [['woldia', 'weldiya'],                          { lat: 11.83, lng: 39.60 }],
  [['debre birhan'],                               { lat: 9.68,  lng: 39.53 }],
  [['debre markos'],                               { lat: 10.34, lng: 37.72 }],
  [['amhara'],                                     { lat: 11.00, lng: 38.00 }],

  // ── Oromia region + cities ───────────────────────────────────────────────────
  [['adama', 'nazret', 'nazreth', 'adaama'],       { lat: 8.54,  lng: 39.27 }],
  [['jimma', 'jima'],                              { lat: 7.67,  lng: 36.83 }],
  [['shashemene', 'shashamane'],                   { lat: 7.20,  lng: 38.60 }],
  [['nekemte', 'naqamte'],                         { lat: 9.08,  lng: 36.55 }],
  [['robe', 'goba'],                               { lat: 7.12,  lng: 40.00 }],
  [['bale'],                                       { lat: 6.90,  lng: 40.30 }],
  [['borana', 'borena'],                           { lat: 4.80,  lng: 38.80 }],
  [['guji'],                                       { lat: 5.80,  lng: 39.00 }],
  [['oromia', 'oromiya', 'oromo'],                 { lat: 8.00,  lng: 39.00 }],

  // ── SNNPR / Sidama / South ───────────────────────────────────────────────────
  [['hawassa', 'awasa'],                           { lat: 7.05,  lng: 38.47 }],
  [['arba minch'],                                 { lat: 6.04,  lng: 37.55 }],
  [['wolayita', 'wolayta', 'wolaita'],             { lat: 6.84,  lng: 37.75 }],
  [['sidama'],                                     { lat: 6.70,  lng: 38.50 }],
  [['snnpr', 'southern nation', 'south ethiopia'], { lat: 7.00,  lng: 38.00 }],

  // ── Afar region ───────────────────────────────────────────────────────────────
  [['semera', 'asaita'],                           { lat: 11.80, lng: 41.00 }],
  [['afar'],                                       { lat: 11.75, lng: 41.00 }],

  // ── Somali region (Ethiopian Somali) ──────────────────────────────────────────
  [['jijiga', 'jigjiga'],                          { lat: 9.35,  lng: 42.80 }],
  [['ogaden'],                                     { lat: 7.00,  lng: 44.00 }],
  [['ethiopian somali', 'somali region'],          { lat: 7.50,  lng: 44.00 }],

  // ── Benishangul-Gumuz ─────────────────────────────────────────────────────────
  [['assosa', 'asosa'],                            { lat: 10.07, lng: 34.53 }],
  [['benishangul', 'benishangul-gumuz'],           { lat: 10.40, lng: 35.50 }],

  // ── Gambella ──────────────────────────────────────────────────────────────────
  [['gambella', 'gambela'],                        { lat: 8.25,  lng: 34.58 }],

  // ── Harari / Dire Dawa ────────────────────────────────────────────────────────
  [['harar', 'harari', 'jugol'],                   { lat: 9.31,  lng: 42.13 }],
  [['dire dawa'],                                  { lat: 9.60,  lng: 41.86 }],

  // ── Blue Nile / GERD / border flashpoints ─────────────────────────────────────
  [['gerd', 'grand renaissance', 'grand ethiopian renaissance'],
                                                   { lat: 11.21, lng: 35.09 }],
  [['blue nile', 'abbay'],                         { lat: 10.50, lng: 36.50 }],

  // ── Horn of Africa neighbours ─────────────────────────────────────────────────
  [['eritrea', 'asmara', 'asmera'],                { lat: 15.34, lng: 38.93 }],
  [['djibouti'],                                   { lat: 11.83, lng: 42.59 }],
  [['somalia', 'mogadishu', 'mogadiscio'],         { lat: 5.15,  lng: 46.20 }],
  [['somaliland', 'hargeisa', 'hargeysa'],         { lat: 9.56,  lng: 44.06 }],
  [['sudan', 'khartoum'],                          { lat: 15.55, lng: 32.53 }],
  [['south sudan', 'juba'],                        { lat: 4.85,  lng: 31.57 }],
  [['kenya', 'nairobi'],                           { lat: -1.29, lng: 36.82 }],

  // ── Generic Ethiopia fallback (last resort) ───────────────────────────────────
  [['ethiopia', 'ethiopian'],                      { lat: 9.145, lng: 40.49 }],
];

/**
 * Try to resolve a location string to approximate coordinates.
 * Returns null if no match found.
 */
export function resolveCoords(location: string | null | undefined): Coords | null {
  if (!location) return null;
  const l = location.toLowerCase();

  for (const [keywords, coords] of LOOKUP) {
    if (keywords.some(kw => l.includes(kw))) {
      return coords;
    }
  }
  return null;
}
