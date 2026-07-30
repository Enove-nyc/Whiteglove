// Spelling-tolerant place matching. Kever towns get transliterated a dozen
// different ways; this lets the search find a place even when the visitor
// spells it differently — via a spelling database plus fuzzy (typo) matching.

// Strip accents/punctuation and lowercase, so "Sátoraljaújhely" ~ "satoraljaujhely".
//
// Hebrew and Yiddish letters are kept. Stripping them left a Yiddish query as
// an empty string, and an empty query matches everything — so searching
// "ליזענסק" silently returned the entire directory rather than Lizhensk.
const HEBREW = "\\u0590-\\u05ff\\ufb1d-\\ufb4f"; // Hebrew block + presentation forms

export function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(new RegExp(`[^a-z0-9${HEBREW}\\s]`, "g"), " ")
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
  // --- batch 3 towns ---
  { keys: ["chernobyl", "chernobyl-meor-einayim"], spellings: ["chernobyl", "chornobyl", "tchernobyl", "chernobil", "meor einayim", "meor enayim", "twersky", "tversky"] },
  { keys: ["karlin-pinsk-aharon-hagadol", "karlin"], spellings: ["karlin", "carlin", "pinsk", "karlin stolin", "stolin", "aharon hagadol", "aaron of karlin", "aharon the great"] },
  { keys: ["zhydachiv-tzvi-hirsch", "zhydachiv"], spellings: ["zhydachiv", "zidichov", "zidichoiv", "zydaczow", "zhidachov", "zidichover", "tzvi hirsch", "eichenstein", "ateres tzvi"] },
  { keys: ["peremyshlyany-meir", "premishlan"], spellings: ["premishlan", "premishlaner", "peremyshlyany", "przemyslany", "peremishlyany", "meir premishlan", "meir'l", "reb meirl"] },
  { keys: ["polonne-toldos-yaakov-yosef", "polonne"], spellings: ["polonne", "polnoye", "polonnoye", "polonoe", "polonn", "toldos yaakov yosef", "toldot yaakov yosef", "yaakov yosef"] },
  { keys: ["ostroh-maharsha", "ostroh"], spellings: ["ostroh", "ostrog", "ostra", "ostroha", "ostro", "maharsha", "shmuel eidels", "samuel edels", "eidels"] },
  { keys: ["radomsko-tiferes-shlomo", "radomsk", "radomsko"], spellings: ["radomsk", "radomsko", "radomsker", "tiferes shlomo", "tiferet shlomo", "shlomo hakohen rabinowicz"] },
  { keys: ["warka-yitzchak-vorki", "vorki", "warka"], spellings: ["vorki", "vorka", "warka", "vurka", "vorker", "yitzchak of vorki", "yitzchak kalish", "kalish"] },
  { keys: ["vyzhnytsia-tzemach-tzadik", "vizhnitz"], spellings: ["vizhnitz", "vizhnits", "vyzhnytsia", "vyzhnitsa", "wiznitz", "viznitz", "tzemach tzadik", "menachem mendel hager", "hager"] },
  { keys: ["bobowa-first-bobover-rebbe", "bobov", "bobowa"], spellings: ["bobov", "bobova", "bobowa", "bobover", "shlomo halberstam", "kedushas tzion"] },
  { keys: ["chortkiv-dovid-moshe", "chortkov"], spellings: ["chortkov", "chortkiv", "czortkow", "tchortkov", "chortkover", "dovid moshe", "david moshe friedman"] },
  { keys: ["sadhora-ruzhiner", "sadigura", "ruzhin"], spellings: ["sadigura", "sadhora", "sadigora", "sadygora", "sadiguro", "ruzhin", "ruzhiner", "rizhin", "yisrael friedman", "israel friedman", "friedman"] },
  { keys: ["talne-dovid-twersky", "talne"], spellings: ["talne", "talnoye", "talna", "talner", "dovid twersky of talne", "david twersky"] },
  { keys: ["amuka-yonasan-ben-uziel", "amuka"], spellings: ["amuka", "amukah", "amuca", "yonasan ben uziel", "yonatan ben uziel", "jonathan ben uzziel", "targum yonasan"] },
  { keys: ["hebron-machpela", "hebron"], spellings: ["hebron", "chevron", "hevron", "chvron", "machpela", "maaras hamachpela", "meoras hamachpela", "cave of the patriarchs", "avos", "avot", "patriarchs"] },
  { keys: ["kever-rochel-bethlehem", "kever rochel"], spellings: ["kever rochel", "kever rachel", "rachels tomb", "rochel imenu", "rachel imenu", "bethlehem", "beis lechem", "beit lechem"] },
  // --- batch 4 ---
  { keys: ["queens-ohel-lubavitch", "ohel"], spellings: ["ohel", "lubavitch", "lubavitcher rebbe", "chabad", "schneerson", "schneersohn", "montefiore", "queens", "cambria heights", "frierdiker rebbe", "rayatz", "the rebbe"] },
  { keys: ["kiryas-joel-satmar", "satmar"], spellings: ["satmar", "satmar rav", "kiryas joel", "kiryas yoel", "monroe", "yoel teitelbaum", "joel teitelbaum", "divrei yoel", "vayoel moshe"] },
  { keys: ["monsey-ribnitzer", "ribnitz"], spellings: ["ribnitz", "ribnitzer", "monsey", "chaim zanvl", "abramowitz", "rybnitsa"] },
  { keys: ["netanya-klausenburger", "klausenburg"], spellings: ["klausenburg", "klausenburger", "sanz klausenburg", "netanya", "divrei yatziv", "shefa chaim", "yekusiel yehuda halberstam", "cluj"] },
  { keys: ["bnei-brak-chazon-ish", "chazon ish"], spellings: ["chazon ish", "chazon eish", "bnei brak", "karelitz", "avraham yeshaya", "zichron meir"] },
  { keys: ["har-hamenuchos-jerusalem", "har hamenuchos"], spellings: ["har hamenuchos", "har hamenuchot", "givat shaul", "jerusalem", "yerushalayim", "auerbach", "elyashiv", "belzer rebbe", "aharon rokeach"] },
  { keys: ["har-hazeisim-jerusalem", "har hazeisim"], spellings: ["har hazeisim", "har hazeitim", "mount of olives", "jerusalem", "yerushalayim", "ohr hachaim", "or hachaim", "ibn attar", "ben attar"] },
  { keys: ["slonim-yesod-haavodah", "slonim"], spellings: ["slonim", "slonimer", "yesod haavodah", "avraham weinberg", "slonim belarus"] },
  { keys: ["kosiv-ahavas-shalom", "kosov"], spellings: ["kosov", "kosiv", "kosover", "ahavas shalom", "ahavat shalom", "menachem mendel hager kosov", "kossov"] },
  { keys: ["sieniawa-shinover", "shinova"], spellings: ["shinova", "shinover", "sieniawa", "shiniva", "yechezkel shraga halberstam", "divrei yechezkel"] },
  { keys: ["komarno-heichal-habracha", "komarno"], spellings: ["komarno", "komarna", "heichal habracha", "safrin", "yitzchak isaac safrin", "zohar chai"] },
  { keys: ["skvyra-skver", "skver"], spellings: ["skver", "skvyra", "skverer", "skwira", "new square", "yitzchak twersky skver"] },
  { keys: ["turiysk-trisk", "trisk"], spellings: ["trisk", "turiysk", "turisk", "magen avraham", "avraham twersky trisk", "turzysk"] },
  { keys: ["savran-savraner", "savran"], spellings: ["savran", "savraner", "savran ukraine", "moshe tzvi giterman", "savraner rebbe"] },
  { keys: ["rotmistrivka-rachmastrivka", "rachmastrivka"], spellings: ["rachmastrivka", "rachmistrivka", "rotmistrivka", "rachmastrivke", "yochanan twersky", "rotmistrovka"] },
  // --- batch 5 ---
  { keys: ["vienna-boyaner", "boyan"], spellings: ["boyan", "boyaner", "vienna", "wien", "zentralfriedhof", "pachad yitzchak", "yitzchak friedman boyan", "boyoner"] },
  { keys: ["nadvirna-nadvorna", "nadvorna"], spellings: ["nadvorna", "nadvirna", "nadworna", "nadvornah", "mordechai leifer", "nadvorner"] },
  { keys: ["kobryn-kobriner", "kobrin"], spellings: ["kobrin", "kobryn", "kobriner", "moshe polier", "moshe of kobrin"] },
  { keys: ["stolin-asher", "stolin"], spellings: ["stolin", "stoliner", "karlin stolin", "asher of stolin", "reb asher"] },
  { keys: ["grodzisk-imrei-elimelech", "grodzisk"], spellings: ["grodzisk", "grodzisker", "gradzisk", "imrei elimelech", "elimelech shapiro", "grojisk"] },
  { keys: ["radoszyce-saba-kadisha", "radoshitz"], spellings: ["radoshitz", "radoszyce", "radoshitzer", "saba kadisha", "sava kadisha", "yissachar ber radoshitz"] },
  { keys: ["lyakhavichy-lechovitcher", "lechovitch"], spellings: ["lechovitch", "lechovitcher", "lyakhavichy", "lachowicze", "mordechai of lechovitch", "lachovich"] },
  { keys: ["koidanov-perlow", "koidanov"], spellings: ["koidanov", "koidanover", "kaidanov", "dzyarzhynsk", "koidanovo", "shlomo chaim perlow", "perlow"] },
  { keys: ["makariv-makarover", "makarov"], spellings: ["makarov", "makariv", "makarover", "nachum twersky makarov", "makarev"] },
  { keys: ["mogielnica-saraf", "mogielnica"], spellings: ["mogielnica", "mogelnitza", "mogielnitza", "saraf of mogielnica", "chaim meir yechiel", "mogilnitza"] },
  { keys: ["stefanesti-friedman", "stefanesti"], spellings: ["stefanesti", "stefanest", "stefaneshti", "stefaneshter", "avraham matisyahu", "friedman stefanesti"] },
  { keys: ["tarnobrzeg-dzikover", "dzikov"], spellings: ["dzikov", "dzikover", "tarnobrzeg", "dzików", "imrei noam", "meir horowitz dzikov"] },
  { keys: ["shepetivka-reb-pinchas", "koretz"], spellings: ["koretz", "koritz", "koritzer", "shepetivka", "shepetovka", "pinchas of koretz", "pinchas koritzer", "midrash pinchas"] },
  // --- batch 6 ---
  { keys: ["kozienice-maggid", "kozhnitz"], spellings: ["kozhnitz", "koznitz", "kozienice", "kozhnitzer", "maggid of kozhnitz", "avodas yisrael", "yisrael hopstein", "hopsztajn"] },
  { keys: ["lublin-chozeh", "lublin"], spellings: ["lublin", "chozeh", "chozeh of lublin", "seer of lublin", "the seer", "yaakov yitzchak horowitz", "zos zichron"] },
  { keys: ["sasiv-moshe-leib", "sasov"], spellings: ["sasov", "sasiv", "sassover", "sassov", "moshe leib sassov", "moshe leib of sasov", "reb moshe leib"] },
  { keys: ["zhytomyr-ohr-hameir", "zhitomir"], spellings: ["zhitomir", "zhytomyr", "zhitomer", "ohr hameir", "or hameir", "zeev wolf", "wolf of zhitomir"] },
  { keys: ["neshchiz-mordechai", "neshchiz"], spellings: ["neshchiz", "neschiz", "neskhizh", "nesukhoyizhe", "mordechai of neshchiz", "neshchizer"] },
  { keys: ["bershad-raphael", "bershad"], spellings: ["bershad", "bershader", "raphael of bershad", "reb raphael"] },
  { keys: ["sighet-yetev-lev", "sighet"], spellings: ["sighet", "siget", "sighetu marmatiei", "seiget", "yetev lev", "yitav lev", "teitelbaum sighet"] },
  { keys: ["sapanta-spinka", "spinka"], spellings: ["spinka", "sapanta", "sapinka", "sepinka", "imrei yosef", "yosef meir weiss"] },
  { keys: ["ostrowiec-meir-yechiel", "ostrovtze"], spellings: ["ostrovtze", "ostrovtzer", "ostrowiec", "ostrovtsa", "meir yechiel", "halstock", "meir einei chachomim"] },
  { keys: ["amshinov-mszczonow", "amshinov"], spellings: ["amshinov", "amshinover", "mszczonow", "amshinev", "yaakov dovid kalish", "amshinower"] },
  { keys: ["sochaczew-avnei-nezer", "sochatchov"], spellings: ["sochatchov", "sochaczew", "sochatchover", "avnei nezer", "eglei tal", "avrohom bornsztain", "bornstein"] },
  { keys: ["radzymin-guterman", "radzymin"], spellings: ["radzymin", "radziminer", "radzimin", "yaakov aryeh guterman", "guterman"] },
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
      if (ht.includes(qt)) return true;
      // The reverse — a haystack word sitting inside the query — is only
      // meaningful for a real word. Allowing any length matched everything:
      // "on" is a substring of "zzzznonsense", and "on" appears in almost
      // every description, so nonsense queries returned results.
      //
      // Four characters turned out not to be enough either. "sense" is five,
      // it is a real word in a real description, and it sits inside
      // "zzzznonsense" — so that same nonsense query still found the Lake
      // District. The length floor alone cannot tell a short word apart from a
      // fragment of a long one, so the word must also be a substantial part of
      // what was typed: half of it or more. "jungfrau" inside a search for
      // "jungfraujoch" still counts; "sense" inside "zzzznonsense" does not.
      if (ht.length >= 4 && ht.length * 2 >= qt.length && qt.includes(ht)) return true;
      return editDistance(qt, ht) <= maxDistanceFor(qt);
    });
  });
}
