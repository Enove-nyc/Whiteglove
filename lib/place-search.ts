// Spelling-tolerant place matching. Kever towns get transliterated a dozen
// different ways; this lets the search find a place even when the visitor
// spells it differently — via a spelling database plus fuzzy (typo) matching.

// Strip accents/punctuation and lowercase, so "Sátoraljaújhely" ~ "satoraljaujhely".
export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein edit distance (small strings only).
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const curr = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }
  return prev[b.length];
}

// Groups of alternate spellings for one place. `keys` are the identifiers used
// in the app data (slugs / canonical titles); `spellings` are every way people
// write it — Latin variants, native names, and the tzaddik/sefer it's known by.
type SpellingGroup = { keys: string[]; spellings: string[] };

export const SPELLING_GROUPS: SpellingGroup[] = [
  { keys: ["lizensk", "lizhensk"], spellings: ["lizhensk", "lizensk", "lezajsk", "lezajsk", "lizhinsk", "lizhens", "lyzhansk", "noam elimelech", "reb elimelech", "elimelech"] },
  { keys: ["uman"], spellings: ["uman", "human", "humen", "ouman", "umon", "rebbe nachman", "nachman", "breslov", "breslev"] },
  { keys: ["medzhybizh"], spellings: ["medzhybizh", "mezhbizh", "mezhibozh", "medzibozh", "mezibush", "mezhbezh", "medzhibozh", "baal shem tov", "besht"] },
  { keys: ["belz"], spellings: ["belz", "belza", "belzer"] },
  { keys: ["kerestir"], spellings: ["kerestir", "keresztur", "bodrogkeresztur", "kerestier", "kerestirer", "reb shayale", "shayale", "yeshaya", "steiner"] },
  { keys: ["munkatch"], spellings: ["munkatch", "munkacs", "mukachevo", "mukacheve", "mukachiv", "minchas elazar", "munkaczer"] },
  { keys: ["sanz", "tzanz"], spellings: ["sanz", "tzanz", "zanz", "nowy sacz", "divrei chaim", "sanzer"] },
  { keys: ["preshburg", "pressburg"], spellings: ["preshburg", "pressburg", "bratislava", "pozsony", "chasam sofer", "chatam sofer", "chsam sofer"] },
  { keys: ["rymanow"], spellings: ["rymanow", "rimanov", "reb mendele", "menachem mendel", "rymanower"] },
  { keys: ["dynow"], spellings: ["dynow", "dinov", "bnei yissaschar", "tzvi elimelech", "dynower"] },
  { keys: ["ropshitz", "ropczyce"], spellings: ["ropshitz", "ropshits", "ropczyce", "lancut", "lancut", "ropshitzer", "naftali"] },
  { keys: ["liska"], spellings: ["liska", "liszka", "olaszliszka", "reb hershele", "hershele", "ach pri tevuah", "lisker"] },
  { keys: ["ijhel", "ujhely"], spellings: ["ijhel", "ihel", "ujhely", "satoraljaujhely", "yismach moshe", "ujhel"] },
  { keys: ["lelov"], spellings: ["lelov", "lelow", "reb dovid", "dovid biderman", "lelover"] },
  { keys: ["krakow", "cracow"], spellings: ["krakow", "cracow", "krokow", "rema", "remu", "moshe isserles"] },
  { keys: ["kaliv", "nagykallo"], spellings: ["kaliv", "kalev", "nagykallo", "kallo", "reb eizik", "yitzchak taub", "kaliver"] },
  { keys: ["ungvar", "uzhhorod"], spellings: ["ungvar", "uzhhorod", "uzhgorod", "ungwar"] },
  { keys: ["kisvarda"], spellings: ["kisvarda", "kleinwardein"] },
  { keys: ["bardejov"], spellings: ["bardejov", "bardiov", "bardyov"] },
  { keys: ["lviv", "lvov"], spellings: ["lviv", "lvov", "lemberg", "lwow"] },
];

// Every spelling from groups whose keys intersect the given place identifiers.
export function extraSpellings(keys: Array<string | undefined>): string {
  const norm = keys.filter(Boolean).map((k) => normalize(String(k)));
  const out: string[] = [];
  for (const group of SPELLING_GROUPS) {
    if (group.keys.some((k) => norm.includes(normalize(k)))) out.push(...group.spellings);
  }
  return out.join(" ");
}

// Typo tolerance scaled to token length.
function maxDistanceFor(token: string): number {
  if (token.length <= 3) return 0;
  if (token.length <= 5) return 1;
  if (token.length <= 8) return 2;
  return 3;
}

/**
 * True if `query` plausibly matches `haystack` — direct substring, or every
 * query word matches some haystack word closely (prefix or within edit
 * distance). Handles accents and small misspellings.
 */
export function fuzzyMatch(query: string, haystack: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const h = normalize(haystack);
  if (h.includes(q)) return true;

  const hTokens = h.split(" ").filter(Boolean);
  const qTokens = q.split(" ").filter(Boolean);
  return qTokens.every((qt) => {
    if (qt.length < 3) return hTokens.some((ht) => ht.startsWith(qt));
    return hTokens.some((ht) => {
      if (ht.includes(qt) || qt.includes(ht)) return true;
      return editDistance(qt, ht) <= maxDistanceFor(qt);
    });
  });
}
