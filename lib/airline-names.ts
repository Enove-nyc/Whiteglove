/**
 * IATA airline codes → names for /book flight rows.
 *
 * WHY THIS EXISTS. Travelpayouts returns a two-character IATA code, including
 * digits: Norse Atlantic is `N0` (N-zero). Shown as a serif heading that code
 * reads as the word "No". The code is fine next to a flight number; it is not
 * a title.
 *
 * The fallback map covers codes this site has actually rendered badly, plus
 * common carriers. hydrateAirlineNames() fills the rest from Travelpayouts'
 * public airlines list when a search runs.
 */

const FALLBACK: Record<string, string> = {
  N0: "Norse Atlantic Airways",
  Z0: "Norse Atlantic UK",
  NO: "Neos",
  IZ: "Arkia",
  LY: "EL AL",
  "6H": "Israir",
  AF: "Air France",
  KL: "KLM",
  BA: "British Airways",
  VS: "Virgin Atlantic",
  LH: "Lufthansa",
  LX: "SWISS",
  OS: "Austrian",
  SN: "Brussels Airlines",
  AZ: "ITA Airways",
  IB: "Iberia",
  TP: "TAP Air Portugal",
  TK: "Turkish Airlines",
  LO: "LOT Polish Airlines",
  SK: "SAS",
  DY: "Norwegian",
  FI: "Icelandair",
  AA: "American Airlines",
  DL: "Delta",
  UA: "United",
  B6: "jetBlue",
  AS: "Alaska Airlines",
  NK: "Spirit",
  F9: "Frontier",
  G4: "Allegiant",
  WN: "Southwest",
  AC: "Air Canada",
  WS: "WestJet",
  EK: "Emirates",
  QR: "Qatar Airways",
  EY: "Etihad",
  SV: "Saudia",
  ET: "Ethiopian",
  SQ: "Singapore Airlines",
  CX: "Cathay Pacific",
  NH: "ANA",
  JL: "Japan Airlines",
  KE: "Korean Air",
  QF: "Qantas",
  LA: "LATAM",
  AM: "Aeromexico",
  AV: "Avianca",
  CM: "Copa Airlines",
  AI: "Air India",
  FR: "Ryanair",
  U2: "easyJet",
  W6: "Wizz Air",
  VY: "Vueling",
  A3: "Aegean",
  A4: "Azimuth",
  SU: "Aeroflot",
  PS: "Ukraine International",
  RO: "TAROM",
  OK: "Czech Airlines",
  BT: "airBaltic",
  AY: "Finnair",
};

const names = new Map<string, string>(Object.entries(FALLBACK));

/** Two-character IATA, digits allowed (N0, G4, 6H). Not a 3-letter ICAO. */
export function airlineCode(value: string | undefined | null): string {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z0-9]{2}$/.test(code) ? code : "";
}

export function airlineName(value: string | undefined | null): string | undefined {
  const code = airlineCode(value);
  return code ? names.get(code) : undefined;
}

/**
 * Heading for a priced row. Never the word "No" (Norse Atlantic is N0).
 * A two-character code is fine next to a flight number, not as the title.
 */
export function airlineHeading(code?: string | null, name?: string | null): string {
  const named = (name ?? "").trim();
  if (named && !/^no$/i.test(named) && named.toUpperCase() !== "N0") return named;
  const fallback = airlineName(code);
  if (fallback && !/^no$/i.test(fallback)) return fallback;
  return "Flight";
}

/** "N0 402" — the code stays a code, never a heading. */
export function flightNumberLabel(code: string | undefined | null, number: string | undefined | null): string {
  const iata = airlineCode(code);
  const n = String(number ?? "").trim();
  if (iata && n) return `${iata} ${n}`;
  if (iata) return iata;
  return n;
}

let hydrate: Promise<void> | null = null;

/**
 * Load the public Travelpayouts airlines list once per process.
 * Failures leave the fallback map in place — N0 still has a name.
 */
export function hydrateAirlineNames(): Promise<void> {
  hydrate ??= (async () => {
    try {
      const response = await fetch("https://api.travelpayouts.com/data/en/airlines.json", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return;
      const rows = (await response.json()) as Array<{ code?: string; name?: string }>;
      if (!Array.isArray(rows)) return;
      for (const row of rows) {
        const code = airlineCode(row.code);
        const name = row.name?.trim();
        if (code && name) names.set(code, name);
      }
      // Codes this site has already rendered badly keep our names, even if
      // the public list is shorter or odd. N0 must not become "No".
      for (const [known, label] of Object.entries(FALLBACK)) names.set(known, label);
    } catch {
      /* fallback map is enough to not print "No" */
    }
  })();
  return hydrate;
}
