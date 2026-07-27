// Bulk kevarim — batch 3. Historically well-documented tzaddikim and their
// burial towns, added so each has a page even when we don't yet have exact,
// verified operational details.
//
// IMPORTANT (safety): who is buried where and in which town is drawn from public
// historical sources (each entry carries a source). We do NOT invent a precise
// grave location, street address, phone, or GPS. Coordinates are intentionally
// left out here — the town is given and the arrival note says "confirm the exact
// location locally". The owner can add verified coordinates later from the
// destination editor. Travelers drive to these places, so nothing is guessed.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries3: Cemetery[] = [
  {
    slug: "chernobyl-meor-einayim",
    city: "Chernobyl",
    yiddishCity: "טשערנאביל",
    name: "Chernobyl — Ohel of the Me'or Einayim",
    yiddishName: "אוהל המאור עינים",
    country: "Ukraine",
    address: "Jewish cemetery, Chernobyl, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Menachem Nachum Twersky, the Me'or Einayim, founder of the Chernobyl chassidic dynasty.",
      "IMPORTANT: Chernobyl lies inside the restricted exclusion zone. Access is tightly controlled and arranged only through authorized escorts — do not travel without confirming current permissions and safety. Exact grave location to be confirmed locally.",
    ],
    accessNote: "Inside the Chernobyl exclusion zone — access is restricted and must be arranged with authorized escorts. Confirm current permissions and the exact grave location before traveling.",
    burials: [
      { name: "Rabbi Menachem Nachum Twersky", yiddishName: "רבי מנחם נחום טווערסקי", knownAs: "The Me'or Einayim", seforim: "מאור עינים · ישמח לב", yahrzeit: "י״א חשון · 5558 / 1797", note: "Founder of the Chernobyl dynasty and a disciple of the Baal Shem Tov and the Maggid of Mezritch." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Menachem_Nachum_Twersky",
  },
  {
    slug: "karlin-pinsk-aharon-hagadol",
    city: "Karlin (Pinsk)",
    yiddishCity: "קארלין",
    name: "Karlin (Pinsk) — Kever of Rabbi Aharon HaGadol",
    yiddishName: "קבר רבי אהרן הגדול מקארלין",
    country: "Belarus",
    address: "Jewish cemetery, Karlin quarter of Pinsk, Belarus — confirm exact location locally",
    arrivalNotes: [
      "Karlin, now a district of Pinsk, is the cradle of the Karlin-Stolin chassidus; Rabbi Aharon HaGadol (Aharon the Great) of Karlin is associated with the town.",
      "Confirm the cemetery and exact grave location locally. Belarus entry rules change — check current travel requirements.",
    ],
    accessNote: "Historic Karlin-Stolin center in Pinsk. Confirm the cemetery, exact grave, and access locally before traveling.",
    burials: [
      { name: "Rabbi Aharon ben Yaakov of Karlin", yiddishName: "רבי אהרן בן יעקב מקארלין", knownAs: "Aharon HaGadol · the Great", seforim: "בית אהרן (school)", yahrzeit: "י״ט ניסן · 5532 / 1772", note: "A leading early chassidic master and founder of the Karlin (Karlin-Stolin) chassidic path." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Aaron_of_Karlin",
  },
  {
    slug: "zhydachiv-tzvi-hirsch",
    city: "Zhydachiv (Zidichov)",
    yiddishCity: "זידיטשוב",
    name: "Zhydachiv — Kever of Rabbi Tzvi Hirsch of Zidichov",
    yiddishName: "קבר רבי צבי הירש מזידיטשוב",
    country: "Ukraine",
    address: "Jewish cemetery, Zhydachiv, Lviv Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Tzvi Hirsch Eichenstein of Zidichov, a foundational master of the Zidichov-Komarno kabbalistic chassidic line.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Tzvi Hirsch Eichenstein", yiddishName: "רבי צבי הירש אייכנשטיין", knownAs: "The Zidichover", seforim: "עטרת צבי · סור מרע ועשה טוב", yahrzeit: "י״א תמוז · 5591 / 1831", note: "Founder of the Zidichov chassidic dynasty, known for deep engagement with kabbalah and the writings of the Arizal." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Tzvi_Hirsch_of_Zidichov",
  },
  {
    slug: "peremyshlyany-meir",
    city: "Peremyshlyany (Premishlan)",
    yiddishCity: "פרעמישלאן",
    name: "Peremyshlyany — Kever of Rabbi Meir of Premishlan",
    yiddishName: "קבר רבי מאיר מפרעמישלאן",
    country: "Ukraine",
    address: "Jewish cemetery, Peremyshlyany, Lviv Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Meir of Premishlan, beloved for his simplicity, wit, and wonder-working.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Meir of Premishlan", yiddishName: "רבי מאיר מפרעמישלאן", knownAs: "Reb Meir'l Premishlaner", yahrzeit: "כ״ט אייר · 5610 / 1850", note: "A celebrated chassidic tzaddik known for spontaneous Torah, humility, and the many stories of his help to the poor." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Meir_of_Premishlan",
  },
  {
    slug: "polonne-toldos-yaakov-yosef",
    city: "Polonne",
    yiddishCity: "פאלנאיע",
    name: "Polonne — Kever of the Toldos Yaakov Yosef",
    yiddishName: "קבר בעל תולדות יעקב יוסף",
    country: "Ukraine",
    address: "Jewish cemetery, Polonne, Khmelnytskyi Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Yaakov Yosef HaKohen of Polonne, the foremost disciple and recorder of the Baal Shem Tov's teachings.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Yaakov Yosef HaKohen of Polonne", yiddishName: "רבי יעקב יוסף הכהן מפולנאה", knownAs: "The Toldos", seforim: "תולדות יעקב יוסף · בן פורת יוסף · צפנת פענח", yahrzeit: "24 Tishrei · c. 5543 / 1783", note: "His Toldos Yaakov Yosef was the first published work of chassidic thought, preserving teachings of the Baal Shem Tov." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jacob_Joseph_of_Polonne",
  },
  {
    slug: "ostroh-maharsha",
    city: "Ostroh (Ostrog)",
    yiddishCity: "אוסטרהא",
    name: "Ostroh — Kever of the Maharsha",
    yiddishName: "קבר המהרש״א",
    country: "Ukraine",
    address: "Old Jewish cemetery, Ostroh, Rivne Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Ostroh was a great center of Torah; Rabbi Shmuel Eidels, the Maharsha, served and is buried there.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Shmuel Eliezer Eidels", yiddishName: "רבי שמואל אליעזר איידלס", knownAs: "The Maharsha", seforim: "חידושי הלכות ואגדות (מהרש״א)", yahrzeit: "ה׳ כסלו · 5392 / 1631", note: "His commentary on the Talmud (Chidushei Halachos v'Aggados) is printed in standard editions of the Gemara." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Samuel_Edels",
  },
  {
    slug: "radomsko-tiferes-shlomo",
    city: "Radomsko",
    yiddishCity: "ראדאמסק",
    name: "Radomsko — Ohel of the Tiferes Shlomo",
    yiddishName: "אוהל תפארת שלמה",
    country: "Poland",
    address: "Jewish cemetery, Radomsko, Łódź Voivodeship, Poland — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Shlomo HaKohen Rabinowicz, the Tiferes Shlomo, founder of the Radomsk chassidic dynasty.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Shlomo HaKohen Rabinowicz", yiddishName: "רבי שלמה הכהן ראבינאוויטש", knownAs: "The Tiferes Shlomo", seforim: "תפארת שלמה", yahrzeit: "כ״ט אדר · 5626 / 1866", note: "Founder of the Radomsk dynasty; his Tiferes Shlomo is a classic of chassidic Torah on the parsha and festivals." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Radomsk_(Hasidic_dynasty)",
  },
  {
    slug: "warka-yitzchak-vorki",
    city: "Warka (Vorki)",
    yiddishCity: "ווארקא",
    name: "Warka — Ohel of Rabbi Yitzchak of Vorki",
    yiddishName: "אוהל רבי יצחק מווארקא",
    country: "Poland",
    address: "Jewish cemetery, Warka, Masovian Voivodeship, Poland — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Yitzchak Kalish of Vorki, known for his boundless love of every Jew.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yitzchak Kalish of Vorki", yiddishName: "רבי יצחק קאליש מווארקא", knownAs: "The Vorker Rebbe", yahrzeit: "כ״ב ניסן · 5608 / 1848", note: "Founder of the Vorki (Warka) chassidus, remembered for extraordinary ahavas Yisrael and his advocacy for the community." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yitzchak_Kalish_of_Vorki",
  },
  {
    slug: "vyzhnytsia-tzemach-tzadik",
    city: "Vyzhnytsia (Vizhnitz)",
    yiddishCity: "וויזשניץ",
    name: "Vyzhnytsia — Kever of the Tzemach Tzadik",
    yiddishName: "קבר הצמח צדיק מוויזשניץ",
    country: "Ukraine",
    address: "Jewish cemetery, Vyzhnytsia, Chernivtsi Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Vyzhnytsia is the cradle of the Vizhnitz chassidus; Rabbi Menachem Mendel Hager, the Tzemach Tzadik, is its founder.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Menachem Mendel Hager", yiddishName: "רבי מנחם מענדל האגער", knownAs: "The Tzemach Tzadik of Vizhnitz", seforim: "צמח צדיק", yahrzeit: "כ״ה אייר · 5645 / 1885", note: "Founder of the Vizhnitz chassidic dynasty, one of the largest chassidic groups today." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Menachem_Mendel_Hager",
  },
  {
    slug: "bobowa-first-bobover-rebbe",
    city: "Bobowa (Bobov)",
    yiddishCity: "באבוב",
    name: "Bobowa — Ohel of the first Bobover Rebbe",
    yiddishName: "אוהל האדמו״ר הראשון מבאבוב",
    country: "Poland",
    address: "Jewish cemetery, Bobowa, Lesser Poland Voivodeship, Poland — confirm exact location locally",
    arrivalNotes: [
      "Bobowa is the cradle of the Bobov chassidus; Rabbi Shlomo Halberstam, its founder, is associated with the town.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Shlomo Halberstam of Bobov", yiddishName: "רבי שלמה האלברשטאם מבאבוב", knownAs: "The first Bobover Rebbe", yahrzeit: "1 Av · 5665 / 1905", note: "Founder of the Bobov chassidic dynasty and a grandson of the Divrei Chaim of Sanz." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Bobov_(Hasidic_dynasty)",
  },
  {
    slug: "chortkiv-dovid-moshe",
    city: "Chortkiv (Chortkov)",
    yiddishCity: "טשארטקאוו",
    name: "Chortkiv — Kever of Rabbi Dovid Moshe of Chortkov",
    yiddishName: "קבר רבי דוד משה מטשארטקאוו",
    country: "Ukraine",
    address: "Jewish cemetery, Chortkiv, Ternopil Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Dovid Moshe Friedman, founder of the Chortkov chassidus and a son of the Ruzhiner Rebbe.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Dovid Moshe Friedman", yiddishName: "רבי דוד משה פרידמן", knownAs: "The Chortkover Rebbe", yahrzeit: "ט״ו מרחשון · 5664 / 1903", note: "Founder of the Chortkov dynasty, one of the sons of Rabbi Yisrael of Ruzhin." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/David_Moshe_Friedman",
  },
  {
    slug: "sadhora-ruzhiner",
    city: "Sadhora (Sadigura)",
    yiddishCity: "סאדיגורא",
    name: "Sadhora — Kever of the Ruzhiner Rebbe",
    yiddishName: "קבר הרוז׳ינער רבי",
    country: "Ukraine",
    address: "Jewish cemetery, Sadhora district of Chernivtsi, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Rabbi Yisrael Friedman of Ruzhin settled in Sadigura after leaving the Russian Empire, and is buried there; his court shaped many chassidic dynasties.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Yisrael Friedman of Ruzhin", yiddishName: "רבי ישראל פרידמן מרוז׳ין", knownAs: "The Ruzhiner · the Sadigura Rebbe", yahrzeit: "ג׳ חשון · 5611 / 1850", note: "The Ruzhiner Rebbe, forebear of the Sadigura, Chortkov, Boyan, Husiatyn and related dynasties." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Israel_Friedman_of_Ruzhyn",
  },
  {
    slug: "talne-dovid-twersky",
    city: "Talne (Talnoye)",
    yiddishCity: "טאלנא",
    name: "Talne — Kever of Rabbi Dovid Twersky",
    yiddishName: "קבר רבי דוד מטאלנא",
    country: "Ukraine",
    address: "Jewish cemetery, Talne, Cherkasy Oblast, Ukraine — confirm exact location locally",
    arrivalNotes: [
      "Resting place of Rabbi Dovid Twersky of Talne, a son of the Chernobyler dynasty who led a large chassidic court.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Dovid Twersky of Talne", yiddishName: "רבי דוד טווערסקי מטאלנא", knownAs: "The Talner Rebbe", yahrzeit: "ט׳ אייר · 5642 / 1882", note: "Founder of the Talne chassidus and a son of Rabbi Mordechai of Chernobyl." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/David_Twersky_(Talne)",
  },
  {
    slug: "amuka-yonasan-ben-uziel",
    city: "Amuka",
    yiddishCity: "עמוקה",
    name: "Amuka — Kever of Rabbi Yonasan ben Uziel",
    yiddishName: "קבר יונתן בן עוזיאל",
    country: "Israel",
    address: "Amuka, western edge of the Biriya Forest, between Tzfat and Rosh Pina, Israel — confirm exact approach locally",
    arrivalNotes: [
      "A marked structure over the ancient burial cave of the Tanna Rabbi Yonasan ben Uziel, in the Biriya Forest north of Tzfat. Long a place of prayer, especially by singles seeking a shidduch.",
      "Busiest around the hilula (26 Sivan). Confirm current access and hours locally.",
    ],
    accessNote: "Marked grave-structure in the Biriya Forest; a well-known site for those praying for a match. Confirm the approach and hours locally.",
    burials: [
      { name: "Rabbi Yonasan ben Uziel", yiddishName: "יונתן בן עוזיאל", knownAs: "The Tanna · author of Targum Yonasan", seforim: "תרגום יונתן", yahrzeit: "כ״ו סיון", note: "A leading disciple of Hillel the Elder; his gravesite is a traditional place of prayer for finding a spouse." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jonathan_ben_Uzziel",
  },
  {
    slug: "hebron-machpela",
    city: "Hebron (Chevron)",
    yiddishCity: "חברון",
    name: "Hebron — Me'aras HaMachpela (Cave of the Patriarchs)",
    yiddishName: "מערת המכפלה",
    country: "Israel / Judea",
    address: "Me'aras HaMachpela, Hebron — confirm current access, security, and hours before traveling",
    arrivalNotes: [
      "The burial place of the Avos and Imahos — Avraham and Sarah, Yitzchak and Rivka, Yaakov and Leah — one of Judaism's holiest sites.",
      "IMPORTANT: Hebron is a security-sensitive area with controlled access that varies by day and by section, and expands on special days (e.g. Chayei Sarah). Confirm current access, security guidance, and hours before traveling.",
    ],
    accessNote: "Security-sensitive holy site with controlled, day-dependent access. Confirm current arrangements, safety guidance, and hours before you go.",
    burials: [
      { name: "Avraham Avinu and Sarah Imenu", yiddishName: "אברהם אבינו ושרה אמנו", note: "The first of the Avos and Imahos buried in the Machpela." },
      { name: "Yitzchak Avinu and Rivka Imenu", yiddishName: "יצחק אבינו ורבקה אמנו", note: "The second couple of the Avos and Imahos." },
      { name: "Yaakov Avinu and Leah Imenu", yiddishName: "יעקב אבינו ולאה אמנו", note: "The third couple of the Avos and Imahos." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Cave_of_the_Patriarchs",
  },
  {
    slug: "kever-rochel-bethlehem",
    city: "Bethlehem (Beis Lechem)",
    yiddishCity: "קבר רחל",
    name: "Kever Rochel (Rachel's Tomb)",
    yiddishName: "קבר רחל אמנו",
    country: "Israel / Judea",
    address: "Kever Rochel, northern edge of Bethlehem — confirm current access and security before traveling",
    arrivalNotes: [
      "The tomb of Rachel Imenu on the road to Bethlehem, a place of prayer for generations — 'Rachel weeping for her children.'",
      "IMPORTANT: The site sits within a secured compound with access that depends on the current situation, usually reached by protected transport. Confirm current access, security, and hours before traveling.",
    ],
    accessNote: "Secured compound reached by protected access; arrangements depend on the current situation. Confirm access, security, and hours before you go.",
    burials: [
      { name: "Rachel Imenu", yiddishName: "רחל אמנו", knownAs: "Our matriarch Rachel", note: "The matriarch Rachel, buried on the road to Bethlehem; a place of prayer especially in times of need." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Rachel%27s_Tomb",
  },
];
