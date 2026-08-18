// Bulk kevarim — batch 6. More historically well-documented chassidic masters
// and their burial towns.
//
// IMPORTANT (safety): who is buried where and in which town is from public
// sources (each entry carries a source). We do NOT invent a precise grave GPS.
// `airportRef` is a CITY-level point used only to rank the nearest airports — it
// is NOT a grave location and must never be used to navigate. Grave navigation
// uses the address; confirm the exact grave/ohel locally.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries6: Cemetery[] = [
  {
    slug: "kozienice-maggid",
    city: "Kozienice",
    yiddishCity: "קאזשניץ",
    name: "Kozienice — Ohel of the Maggid of Kozhnitz",
    yiddishName: "אוהל המגיד מקאזשניץ",
    country: "Poland",
    address: "Jewish cemetery, Kozienice, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "51.585, 21.545",
    arrivalNotes: [
      "Resting place of Rabbi Yisrael Hopstein, the Maggid of Kozhnitz, one of the founding fathers of Polish chassidus.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yisrael Hopstein", yiddishName: "רבי ישראל האפשטיין", knownAs: "The Maggid of Kozhnitz", seforim: "עבודת ישראל", yahrzeit: "י״ד תשרי · 5575 / 1814", note: "A disciple of the Maggid of Mezritch and Reb Elimelech of Lizhensk; a founder of chassidus in Poland." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Israel_Hopsztajn",
  },
  {
    slug: "lublin-chozeh",
    city: "Lublin",
    yiddishCity: "לובלין",
    name: "Lublin — Ohel of the Chozeh of Lublin",
    yiddishName: "אוהל החוזה מלובלין",
    country: "Poland",
    address: "Old Jewish cemetery, Lublin, Lublin Voivodeship, Poland — confirm exact location locally",
    airportRef: "51.246, 22.568",
    arrivalNotes: [
      "Resting place of Rabbi Yaakov Yitzchak Horowitz, the Chozeh (Seer) of Lublin, whose court raised a generation of Polish rebbes.",
      "In the old Jewish cemetery of Lublin; confirm the exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yaakov Yitzchak Horowitz", yiddishName: "רבי יעקב יצחק הורוביץ", knownAs: "The Chozeh (Seer) of Lublin", seforim: "זאת זכרון · זכרון זאת · דברי אמת", yahrzeit: "ט׳ אב · 5575 / 1815", note: "Teacher of the Yid HaKadosh, the Kozhnitzer Maggid's circle, and many of the great Polish rebbes." },
      // The Chozeh is the name Lublin is known for, but this ground is three
      // centuries older than him and holds the men who made Lublin a Torah
      // centre in the first place. Somebody coming only for the Chozeh walks
      // past them.
      { name: "Rabbi Shlomo Luria", yiddishName: "רבי שלמה לוריא", knownAs: "The Maharshal", seforim: "ים של שלמה · חכמת שלמה", note: "Niftar 1573. Rosh yeshiva in Lublin and one of the foremost poskim of Ashkenaz; the Maharshal shul in Lublin carried his name." },
      { name: "Rabbi Shalom Shachna ben Yosef", yiddishName: "רבי שלום שכנא", knownAs: "Founder of the Lublin yeshiva", note: "Niftar 1558. Rebbe of the Rema, and the man who made Lublin a place people came to learn." },
      { name: "Rabbi Yaakov Kopelman ben Yehuda HaLevi", yiddishName: "רבי יעקב קאפעלמאן הלוי", note: "Niftar 1541. His matzeivah is the oldest Jewish gravestone in Poland still standing where it was set." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jacob_Isaac_Horowitz",
  },
  {
    slug: "sasiv-moshe-leib",
    city: "Sasiv (Sasov)",
    yiddishCity: "סאסוב",
    name: "Sasiv — Kever of Rabbi Moshe Leib of Sasov",
    yiddishName: "ציון רבי משה לייב מסאסוב",
    country: "Ukraine",
    address: "Jewish cemetery, Sasiv, Lviv Oblast, Ukraine — confirm exact location locally",
    airportRef: "49.850, 24.950",
    arrivalNotes: [
      "Resting place of Rabbi Moshe Leib of Sasov, famed for his boundless love of every Jew and his care for the suffering.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Moshe Leib of Sasov", yiddishName: "רבי משה לייב מסאסוב", knownAs: "Reb Moshe Leib Sassover", seforim: "ליקוטי רמ״ל · תורת רמ״ל", yahrzeit: "ד׳ שבט · 5567 / 1807", note: "A disciple of Reb Shmelke of Nikolsburg; celebrated for ahavas Yisrael and acts of chesed." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Moshe_Leib_of_Sassov",
  },
  {
    slug: "zhytomyr-ohr-hameir",
    city: "Zhytomyr",
    yiddishCity: "זשיטאמיר",
    name: "Zhytomyr — Kever of the Ohr HaMeir",
    yiddishName: "ציון בעל אור המאיר",
    country: "Ukraine",
    address: "Jewish cemetery, Zhytomyr, Zhytomyr Oblast, Ukraine — confirm exact location locally",
    airportRef: "50.254, 28.658",
    arrivalNotes: [
      "Resting place of Rabbi Zeev Wolf of Zhitomir, the Ohr HaMeir, a close disciple of the Maggid of Mezritch.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Zeev Wolf of Zhitomir", yiddishName: "רבי זאב וואלף מזשיטאמיר", knownAs: "The Ohr HaMeir", seforim: "אור המאיר", yahrzeit: "כ׳ אדר · c. 5558 / 1798", note: "A leading disciple of the Maggid of Mezritch; his Ohr HaMeir is a classic of chassidic thought." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Zev_Wolf_of_Zhitomir",
  },
  {
    slug: "neshchiz-mordechai",
    city: "Nesukhoyizhe (Neshchiz)",
    yiddishCity: "נעסכיז",
    name: "Neshchiz — Kever of Rabbi Mordechai of Neshchiz",
    yiddishName: "ציון רבי מרדכי מנעסכיז",
    country: "Ukraine",
    address: "Jewish cemetery, Nesukhoyizhe, Volyn Oblast, Ukraine — confirm exact location locally",
    airportRef: "51.100, 24.900",
    arrivalNotes: [
      "Resting place of Rabbi Mordechai of Neshchiz, a beloved Volhynian tzaddik and founder of the Neskhizh line.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Mordechai of Neshchiz", yiddishName: "רבי מרדכי מנעסכיז", knownAs: "The Neshchizer Rebbe", yahrzeit: "י׳ אב · c. 5560 / 1800", note: "A disciple of Reb Yechiel Michel of Zlotchov; founder of the Neskhizh chassidus." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Mordechai_of_Neshchiz",
  },
  {
    slug: "bershad-raphael",
    city: "Bershad",
    yiddishCity: "בערשאד",
    name: "Bershad — Kever of Rabbi Raphael of Bershad",
    yiddishName: "ציון רבי רפאל מבערשאד",
    country: "Ukraine",
    address: "Jewish cemetery, Bershad, Vinnytsia Oblast, Ukraine — confirm exact location locally",
    airportRef: "48.365, 29.517",
    arrivalNotes: [
      "Resting place of Rabbi Raphael of Bershad, the foremost disciple of Rabbi Pinchas of Koretz, renowned for his devotion to truth.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Raphael of Bershad", yiddishName: "רבי רפאל מבערשאד", knownAs: "Reb Raphael Bershader", yahrzeit: "י״ז אייר · c. 5587 / 1827", note: "The leading disciple of Rabbi Pinchas of Koretz; a byword for absolute truthfulness." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pinchas_of_Koretz",
  },
  {
    slug: "sighet-yetev-lev",
    city: "Sighetu Marmației (Sighet)",
    yiddishCity: "סיגעט",
    name: "Sighet — Kever of the Yetev Lev",
    yiddishName: "ציון היטב לב מסיגעט",
    country: "Romania",
    address: "Jewish cemetery, Sighetu Marmației, Maramureș County, Romania — confirm exact location locally",
    airportRef: "47.929, 23.886",
    arrivalNotes: [
      "THREE GENERATIONS LIE IN ONE OHEL HERE, not one kever. It was built over the Yetev Lev immediately after his petirah, and his son and grandson were buried in it after him.",
      "This is the Satmar Rov's own family ground: the Kedushas Yom Tov was his father and the Yetev Lev his grandfather. Reb Yoel himself is not here — he lies in Kiryas Joel.",
      "The ohel was restored after its roof was damaged by fire, when candles lit at the kever caught the kvittlach pushed into the cracks. Do not add to that.",
      "Confirm the cemetery and exact ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yekusiel Yehuda Teitelbaum", yiddishName: "רבי יקותיאל יהודה טייטלבוים", knownAs: "The Yetev Lev of Sighet", seforim: "ייטב לב · ייטב פנים", yahrzeit: "ו׳ אלול · 5643 / 1883", note: "Founder of the Sighet chassidus; a grandson of the Yismach Moshe and grandfather of the Satmar Rav." },
      { name: "Rabbi Chananya Yom Tov Lipa Teitelbaum", yiddishName: "רבי חנניה יום טוב ליפא טייטלבוים", knownAs: "The Kedushas Yom Tov", seforim: "קדושת יום טוב", yahrzeit: "5664 / 1904", note: "1836–1904. Son of the Yetev Lev, rebbe of Sighet after him, and father of the Satmar Rov. He is buried in his father's ohel, with his rebbetzin Chana." },
      { name: "Rabbi Chaim Tzvi Teitelbaum", yiddishName: "רבי חיים צבי טייטלבוים", knownAs: "The Atzei Chaim of Sighet", seforim: "עצי חיים", note: "Son of the Kedushas Yom Tov and rebbe of Sighet after him, buried in the same ohel — the third generation in it." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yekusiel_Yehuda_Teitelbaum_(I)",
  },
  {
    slug: "sapanta-spinka",
    city: "Săpânța (Spinka)",
    yiddishCity: "ספינקא",
    name: "Săpânța — Kever of the Imrei Yosef of Spinka",
    yiddishName: "ציון האמרי יוסף מספינקא",
    country: "Romania",
    address: "Jewish cemetery, Săpânța, Maramureș County, Romania — confirm exact location locally",
    airportRef: "47.970, 23.700",
    arrivalNotes: [
      "Resting place of Rabbi Yosef Meir Weiss, the Imrei Yosef, founder of the Spinka chassidus.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yosef Meir Weiss", yiddishName: "רבי יוסף מאיר ווייס", knownAs: "The Imrei Yosef of Spinka", seforim: "אמרי יוסף", yahrzeit: "כ״ב אלול · 5669 / 1909", note: "Founder of the Spinka chassidus, known for fiery avodah and simcha." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yosef_Meir_Weiss",
  },
  {
    slug: "ostrowiec-meir-yechiel",
    city: "Ostrowiec Świętokrzyski",
    yiddishCity: "אסטראווצע",
    name: "Ostrowiec — Kever of the Ostrovtzer Rebbe",
    yiddishName: "ציון האסטראווצער רבי",
    country: "Poland",
    address: "Jewish cemetery, Ostrowiec Świętokrzyski, Świętokrzyskie Voivodeship, Poland — confirm exact location locally",
    airportRef: "50.929, 21.385",
    arrivalNotes: [
      "Resting place of Rabbi Meir Yechiel Halevi Halstock, the Ostrovtzer Rebbe, famed as a gaon and for his decades of fasting.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Meir Yechiel Halevi Halstock", yiddishName: "רבי מאיר יחיאל הלוי האלשטאק", knownAs: "The Ostrovtzer Rebbe", seforim: "מאיר עיני חכמים", yahrzeit: "י״ט אדר · 5688 / 1928", note: "Renowned Polish gaon and rebbe, known for his gematria-Torah and lifelong fasting." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Meir_Yechiel_Halstock",
  },
  {
    slug: "amshinov-mszczonow",
    city: "Mszczonów (Amshinov)",
    yiddishCity: "אמשינאוו",
    name: "Mszczonów — Kever of the first Amshinover Rebbe",
    yiddishName: "ציון האדמו״ר הראשון מאמשינאוו",
    country: "Poland",
    address: "Jewish cemetery, Mszczonów, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "51.975, 20.517",
    arrivalNotes: [
      "Resting place of Rabbi Yaakov Dovid Kalish, founder of the Amshinov chassidus, a son of the Vorker Rebbe.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yaakov Dovid Kalish of Amshinov", yiddishName: "רבי יעקב דוד קאליש מאמשינאוו", knownAs: "The first Amshinover Rebbe", yahrzeit: "5638 / 1878", note: "Founder of the Amshinov chassidus and a son of Rabbi Yitzchak of Vorki." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Amshinov_(Hasidic_dynasty)",
  },
  {
    slug: "sochaczew-avnei-nezer",
    city: "Sochaczew",
    yiddishCity: "סאכאטשאוו",
    name: "Sochaczew — Kever of the Avnei Nezer",
    yiddishName: "ציון האבני נזר",
    country: "Poland",
    address: "Jewish cemetery, Sochaczew, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "52.229, 20.238",
    arrivalNotes: [
      "Resting place of Rabbi Avrohom Bornsztain, the Avnei Nezer, founder of the Sochatchov chassidus and one of the great poskim of his age.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Avrohom Bornsztain", yiddishName: "רבי אברהם בורנשטיין", knownAs: "The Avnei Nezer of Sochatchov", seforim: "אבני נזר · אגלי טל", yahrzeit: "י״א אדר · 5670 / 1910", note: "A son-in-law of the Kotzker Rebbe; a towering posek and founder of the Sochatchov chassidus." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Avrohom_Bornsztain",
  },
  {
    slug: "radzymin-guterman",
    city: "Radzymin",
    yiddishCity: "ראדזימין",
    name: "Radzymin — Kever of Rabbi Yaakov Aryeh of Radzymin",
    yiddishName: "ציון רבי יעקב אריה מראדזימין",
    country: "Poland",
    address: "Jewish cemetery, Radzymin, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "52.418, 21.191",
    arrivalNotes: [
      "Resting place of Rabbi Yaakov Aryeh Guterman, founder of the Radzymin chassidus, a disciple of the Chidushei HaRim and Rabbi Menachem Mendel of Kotzk.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yaakov Aryeh Guterman of Radzymin", yiddishName: "רבי יעקב אריה גוטרמן מראדזימין", knownAs: "The Radziminer Rebbe", yahrzeit: "כ״ג ניסן · 5634 / 1874", note: "Founder of the Radzymin chassidus, beloved for his warmth and blessings." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yaakov_Aryeh_Guterman",
  },
];
