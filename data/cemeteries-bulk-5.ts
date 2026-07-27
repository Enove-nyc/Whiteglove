// Bulk kevarim — batch 5. More historically well-documented chassidic masters
// and their burial towns.
//
// IMPORTANT (safety): who is buried where and in which town is from public
// sources (each entry carries a source). We do NOT invent a precise grave GPS.
// `airportRef` is a CITY-level point used only to rank the nearest airports — it
// is NOT a grave location and must never be used to navigate. Grave navigation
// uses the address; confirm the exact grave/ohel locally.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries5: Cemetery[] = [
  {
    slug: "vienna-boyaner",
    city: "Vienna",
    yiddishCity: "ווין",
    name: "Vienna — Kever of the first Boyaner Rebbe",
    yiddishName: "ציון הבויאנער רבי",
    country: "Austria",
    address: "Jewish section, Vienna Central Cemetery (Zentralfriedhof), Simmering, Vienna, Austria — confirm exact location locally",
    airportRef: "48.150, 16.441",
    arrivalNotes: [
      "Resting place of Rabbi Yitzchak Friedman, the first Boyaner Rebbe, a grandson of the Ruzhiner, in the Jewish section of Vienna's Central Cemetery.",
      "The Zentralfriedhof is very large; confirm the Jewish section (Tor / gate) and the exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Yitzchak Friedman of Boyan", yiddishName: "רבי יצחק פרידמן מבויאן", knownAs: "The Pachad Yitzchak · first Boyaner Rebbe", yahrzeit: "ט״ז אדר · 5677 / 1917", note: "Founder of the Boyan chassidus and a grandson of Rabbi Yisrael of Ruzhin." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yitzchak_Friedman_of_Boyan",
  },
  {
    slug: "nadvirna-nadvorna",
    city: "Nadvirna (Nadvorna)",
    yiddishCity: "נאדווארנא",
    name: "Nadvirna — Kever of Rabbi Mordechai of Nadvorna",
    yiddishName: "ציון רבי מרדכי מנאדווארנא",
    country: "Ukraine",
    address: "Jewish cemetery, Nadvirna, Ivano-Frankivsk Oblast, Ukraine — confirm exact location locally",
    airportRef: "48.634, 24.570",
    arrivalNotes: [
      "Resting place of Rabbi Mordechai Leifer of Nadvorna, founder of the far-reaching Nadvorna chassidic line.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Mordechai Leifer of Nadvorna", yiddishName: "רבי מרדכי לייפער מנאדווארנא", knownAs: "The Nadvorna Rebbe", yahrzeit: "כ״ה סיון · 5654 / 1894", note: "Founder of the Nadvorna dynasty, forebear of many chassidic courts (Nadvorna, Bania, Pittsburgh and others)." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Nadvorna_(Hasidic_dynasty)",
  },
  {
    slug: "kobryn-kobriner",
    city: "Kobryn",
    yiddishCity: "קאברין",
    name: "Kobryn — Kever of Rabbi Moshe of Kobrin",
    yiddishName: "ציון רבי משה מקאברין",
    country: "Belarus",
    address: "Jewish cemetery, Kobryn, Brest region, Belarus — confirm exact location locally",
    airportRef: "52.216, 24.359",
    arrivalNotes: [
      "Resting place of Rabbi Moshe Polier of Kobrin, a disciple of the Lechovitch line and founder of the Kobrin chassidus.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Moshe Polier of Kobrin", yiddishName: "רבי משה פּאליער מקאברין", knownAs: "The Kobriner Rebbe", yahrzeit: "כ״ט ניסן · 5618 / 1858", note: "Founder of the Kobrin chassidus, known for fervent avodah and closeness to his chassidim." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Moshe_of_Kobryn",
  },
  {
    slug: "stolin-asher",
    city: "Stolin",
    yiddishCity: "סטאלין",
    name: "Stolin — Kever of Rabbi Asher of Stolin",
    yiddishName: "ציון רבי אשר מסטאלין",
    country: "Belarus",
    address: "Jewish cemetery, Stolin, Brest region, Belarus — confirm exact location locally",
    airportRef: "51.889, 26.851",
    arrivalNotes: [
      "Stolin is the seat of the Karlin-Stolin chassidus; Rabbi Asher of Stolin, son of Rabbi Aharon the Great of Karlin, is associated with the town.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Asher of Stolin", yiddishName: "רבי אשר מסטאלין", knownAs: "Reb Asher I of Stolin", yahrzeit: "כ״ד תשרי · 5588 / 1827", note: "Son of Rabbi Aharon HaGadol of Karlin; a leader of the Karlin-Stolin chassidus." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Karlin_(Hasidic_dynasty)",
  },
  {
    slug: "grodzisk-imrei-elimelech",
    city: "Grodzisk Mazowiecki",
    yiddishCity: "גראדזיסק",
    name: "Grodzisk — Kever of the Imrei Elimelech",
    yiddishName: "ציון האמרי אלימלך",
    country: "Poland",
    address: "Jewish cemetery, Grodzisk Mazowiecki, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "52.107, 20.634",
    arrivalNotes: [
      "Resting place of Rabbi Elimelech Shapiro of Grodzisk, the Imrei Elimelech, a great-grandson of the Maggid of Kozhnitz.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Elimelech Shapiro of Grodzisk", yiddishName: "רבי אלימלך שפירא מגראדזיסק", knownAs: "The Imrei Elimelech", seforim: "אמרי אלימלך · דברי אלימלך", yahrzeit: "כ״ז כסלו · 5653 / 1892", note: "A leading Polish rebbe descended from the Kozhnitzer Maggid." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Elimelech_Shapiro",
  },
  {
    slug: "radoszyce-saba-kadisha",
    city: "Radoszyce",
    yiddishCity: "ראדושיץ",
    name: "Radoszyce — Kever of the Saba Kadisha",
    yiddishName: "ציון הסבא קדישא מראדושיץ",
    country: "Poland",
    address: "Jewish cemetery, Radoszyce, Świętokrzyskie Voivodeship, Poland — confirm exact location locally",
    airportRef: "51.073, 20.264",
    arrivalNotes: [
      "Resting place of Rabbi Yissachar Ber of Radoshitz, the 'Saba Kadisha,' famed as a wonder-worker and healer.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Yissachar Ber of Radoshitz", yiddishName: "רבי יששכר בער מראדושיץ", knownAs: "The Saba Kadisha (Holy Grandfather)", yahrzeit: "י״ז ניסן · 5603 / 1843", note: "A disciple of the Chozeh of Lublin and the Yid HaKadosh, sought by many for yeshuos." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Yissachar_Dov_Ber_of_Radoszyce",
  },
  {
    slug: "lyakhavichy-lechovitcher",
    city: "Lyakhavichy (Lechovitch)",
    yiddishCity: "לעחאוויטש",
    name: "Lyakhavichy — Kever of Rabbi Mordechai of Lechovitch",
    yiddishName: "ציון רבי מרדכי מלעחאוויטש",
    country: "Belarus",
    address: "Jewish cemetery, Lyakhavichy, Brest region, Belarus — confirm exact location locally",
    airportRef: "53.033, 26.264",
    arrivalNotes: [
      "Resting place of Rabbi Mordechai of Lechovitch, founder of the Lechovitch chassidus (a forerunner of Kobrin and Slonim).",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Mordechai of Lechovitch", yiddishName: "רבי מרדכי מלעחאוויטש", knownAs: "The Lechovitcher Rebbe", yahrzeit: "ט״ו שבט · 5570 / 1810", note: "Founder of the Lechovitch chassidus, from which the Kobrin and Slonim lines descend." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Mordechai_of_Lechovitch",
  },
  {
    slug: "koidanov-perlow",
    city: "Koidanovo (Dzyarzhynsk)",
    yiddishCity: "קוידאנאוו",
    name: "Koidanovo — Kever of the first Koidanover Rebbe",
    yiddishName: "ציון האדמו״ר הראשון מקוידאנאוו",
    country: "Belarus",
    address: "Jewish cemetery, Dzyarzhynsk (Koidanovo), Minsk region, Belarus — confirm exact location locally",
    airportRef: "53.684, 27.139",
    arrivalNotes: [
      "Resting place of Rabbi Shlomo Chaim Perlow, founder of the Koidanov chassidus (a branch of the Karlin-Lechovitch line).",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Shlomo Chaim Perlow of Koidanov", yiddishName: "רבי שלמה חיים פּערלאוו מקוידאנאוו", knownAs: "The Koidanover Rebbe", yahrzeit: "י״א אדר · 5622 / 1862", note: "Founder of the Koidanov chassidic dynasty." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Koidanov_(Hasidic_dynasty)",
  },
  {
    slug: "makariv-makarover",
    city: "Makariv (Makarov)",
    yiddishCity: "מאקאראוו",
    name: "Makariv — Kever of Rabbi Nachum of Makarov",
    yiddishName: "ציון רבי נחום ממאקאראוו",
    country: "Ukraine",
    address: "Jewish cemetery, Makariv, Kyiv Oblast, Ukraine — confirm exact location locally",
    airportRef: "50.462, 29.813",
    arrivalNotes: [
      "Resting place of Rabbi Nachum Twersky of Makarov, a son of the Chernobyl dynasty.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Nachum Twersky of Makarov", yiddishName: "רבי נחום טווערסקי ממאקאראוו", knownAs: "The Makarover Rebbe", yahrzeit: "י׳ אייר · 5612 / 1852", note: "A son of Rabbi Mordechai of Chernobyl and founder of the Makarov chassidus." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Twersky_(Hasidic_dynasty)",
  },
  {
    slug: "mogielnica-saraf",
    city: "Mogielnica",
    yiddishCity: "מאגלניצא",
    name: "Mogielnica — Kever of Rabbi Chaim Meir Yechiel",
    yiddishName: "ציון השרף ממאגלניצא",
    country: "Poland",
    address: "Jewish cemetery, Mogielnica, Masovian Voivodeship, Poland — confirm exact location locally",
    airportRef: "51.688, 20.717",
    arrivalNotes: [
      "Resting place of Rabbi Chaim Meir Yechiel Shapiro of Mogielnica, the 'Saraf,' a grandson of the Kozhnitzer Maggid.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Chaim Meir Yechiel Shapiro of Mogielnica", yiddishName: "רבי חיים מאיר יחיאל שפירא ממאגלניצא", knownAs: "The Saraf of Mogielnica", yahrzeit: "כ״ט תשרי · 5610 / 1849", note: "A grandson of the Maggid of Kozhnitz, known for his fiery avodah." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Chaim_Meir_Yechiel_Shapiro",
  },
  {
    slug: "stefanesti-friedman",
    city: "Ștefănești",
    yiddishCity: "סטעפאנעשט",
    name: "Ștefănești — Kever of Rabbi Avraham Matisyahu",
    yiddishName: "ציון רבי אברהם מתתיהו מסטעפאנעשט",
    country: "Romania",
    address: "Jewish cemetery, Ștefănești, Botoșani County, Romania — confirm exact location locally",
    airportRef: "47.800, 27.200",
    arrivalNotes: [
      "Resting place of Rabbi Avraham Matisyahu Friedman of Ștefănești, a son of the Ruzhin line, beloved by Romanian Jewry.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Avraham Matisyahu Friedman of Ștefănești", yiddishName: "רבי אברהם מתתיהו פרידמן מסטעפאנעשט", knownAs: "The Stefaneshter Rebbe", yahrzeit: "י׳ סיון · 5693 / 1933", note: "A grandson of Rabbi Yisrael of Ruzhin; his kever remains a place of pilgrimage in Romania." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Avraham_Matisyahu_Friedman",
  },
  {
    slug: "tarnobrzeg-dzikover",
    city: "Tarnobrzeg (Dzikov)",
    yiddishCity: "דזשיקאוו",
    name: "Tarnobrzeg — Kever of the Dzikover Rebbe",
    yiddishName: "ציון הדזשיקאווער רבי",
    country: "Poland",
    address: "Jewish cemetery, Tarnobrzeg (Dzików), Subcarpathian Voivodeship, Poland — confirm exact location locally",
    airportRef: "50.573, 21.679",
    arrivalNotes: [
      "Resting place of Rabbi Meir Horowitz of Dzikov, the Imrei Noam, a leading Galician rebbe of the Ropshitz line.",
      "Confirm the cemetery and exact grave/ohel location locally.",
    ],
    burials: [
      { name: "Rabbi Meir Horowitz of Dzikov", yiddishName: "רבי מאיר הורוביץ מדזשיקאוו", knownAs: "The Imrei Noam", seforim: "אמרי נועם", yahrzeit: "כ״ט אייר · 5637 / 1877", note: "Founder of the Dzikov chassidus, a grandson of the Ropshitzer Rav." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Meir_Horowitz_of_Dzikov",
  },
  {
    slug: "shepetivka-reb-pinchas",
    city: "Shepetivka",
    yiddishCity: "שעפעטיווקא",
    name: "Shepetivka — Kever of Rabbi Pinchas of Koretz",
    yiddishName: "ציון רבי פנחס מקאריץ",
    country: "Ukraine",
    address: "Jewish cemetery, Shepetivka, Khmelnytskyi Oblast, Ukraine — confirm exact location locally",
    airportRef: "50.183, 27.063",
    arrivalNotes: [
      "Rabbi Pinchas Shapiro of Koretz, a close disciple of the Baal Shem Tov, passed away in Shepetivka on his way to Eretz Yisrael and is buried there.",
      "Confirm the cemetery and exact grave location locally.",
    ],
    burials: [
      { name: "Rabbi Pinchas Shapiro of Koretz", yiddishName: "רבי פנחס שפירא מקאריץ", knownAs: "Reb Pinchas Koritzer", seforim: "מדרש פנחס · אמרי פנחס", yahrzeit: "י׳ אלול · 5550 / 1790", note: "A foremost disciple of the Baal Shem Tov, celebrated for his teachings on truth and humility." },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Pinchas_of_Koretz",
  },
];
