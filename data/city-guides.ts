export type CityGuide = {
  slug: string;
  city: string;
  yiddishCity: string;
  country: string;
  tzaddik: string;
  yiddishTzaddik: string;
  aliases?: string[];
  overview: string;
  seforim: string;
  yahrzeit: string;
  niftar: string;
  graveAddress?: string;
  graveCoordinates?: string;
  findingNotes?: string[];
  safetyNote?: string;
  sourceUrl: string;
};

export const cityGuides: CityGuide[] = [
  {
    slug: "uman",
    city: "Uman",
    yiddishCity: "אומאן",
    country: "Ukraine",
    tzaddik: "Rebbe Nachman of Breslov",
    yiddishTzaddik: "רבינו נחמן מברסלב",
    aliases: ["אומן", "Breslov", "ברסלב"],
    overview: "Rebbe Nachman, founder of Breslov Chassidus, is buried in Uman. His teachings continue to guide generations through emunah, simchah, tefillah, and personal growth.",
    seforim: "Likutey Moharan · Sippurei Ma'asiyot · Sefer HaMiddos",
    yahrzeit: "18 Tishrei",
    niftar: "5571 / 1810",
    graveAddress: "Pushkina St 27A, Uman, Cherkasy Oblast, Ukraine, 20300",
    graveCoordinates: "48.7487, 30.2231",
    findingNotes: [
      "Set navigation to Pushkina Street 27A; the tziyun is on Pushkina Street.",
      "From central Uman, the route approaches from the direction of Sofiyivka Park and continues along Pushkina Street.",
      "During Rosh Hashanah and other busy periods, follow current local crowd-control and security directions rather than relying on a usual walking route.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    sourceUrl: "https://www.breslov.com/center/article_rebyahrzeit.html",
  },
  {
    slug: "medzhybizh",
    city: "Medzhybizh",
    yiddishCity: "מעזשיבוזש",
    country: "Ukraine",
    tzaddik: "Rabbi Yisrael Baal Shem Tov",
    yiddishTzaddik: "דער בעל שם טוב",
    aliases: ["Mezhibuzh", "מז'יבוז'", "בעש"],
    overview: "The Baal Shem Tov, known as the Besht and regarded as the founder of Chassidus, lived in Medzhybizh and is buried there.",
    seforim: "His teachings are preserved in works including Keter Shem Tov and Tzava'at HaRivash.",
    yahrzeit: "6 Sivan · Shavuos",
    niftar: "5520 / 1760",
    graveAddress: "Baal Shem Tova St 24, Medzhybizh, Khmelnytskyi Oblast, Ukraine",
    graveCoordinates: "49.440896, 27.404349",
    findingNotes: [
      "The ohel is in Medzhybizh's old Jewish cemetery, on Baal Shem Tova Street.",
      "The cemetery is north of the Medzhybizh Fortress; published local directions describe it as roughly four blocks north of the fortress.",
      "Once inside the cemetery, look for the ohel over the Baal Shem Tov's kever.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    sourceUrl: "https://encyclopedia.yivo.org/article.aspx/Baal_Shem_Tov",
  },
  {
    slug: "belz",
    city: "Belz",
    yiddishCity: "בעלז",
    country: "Ukraine",
    tzaddik: "Rabbi Shalom Rokeach, the Sar Shalom",
    yiddishTzaddik: "דער שר שלום מבעלז",
    aliases: ["Bełz", "שר שלום"],
    overview: "The Sar Shalom was the first Belzer Rebbe and founder of the Belz dynasty, whose leadership shaped the town into a major Chassidic center.",
    seforim: "Dover Shalom",
    yahrzeit: "27 Elul",
    niftar: "5615 / 1855",
    graveAddress: "Belz Jewish Cemetery, opposite 47 Mitskevycha Street, Belz, Ukraine",
    graveCoordinates: "50.38310, 23.99170",
    findingNotes: [
      "Navigate to the cemetery opposite 47 Mitskevycha Street in Belz.",
      "The ohel containing the Sar Shalom's tziyun is outside the cemetery fence.",
      "Confirm current gate and access arrangements before traveling, as cemetery access can change.",
    ],
    safetyNote: "Ukraine remains subject to rapidly changing security conditions and transport disruption. Check official travel advice and local guidance immediately before making any plans.",
    sourceUrl: "https://worldofbelz.org/history/the-holy-sar-shalom/",
  },
  {
    slug: "lelov",
    city: "Lelov",
    yiddishCity: "לעלוב",
    country: "Poland",
    tzaddik: "Rabbi Dovid Biderman of Lelov",
    yiddishTzaddik: "רבי דוד מלעלוב",
    aliases: ["Lelów", "לעלאוו"],
    overview: "Reb Dovid of Lelov founded the Lelov dynasty. He is remembered for his ahavas Yisrael and was a disciple of Reb Elimelech of Lizhensk and the Chozeh of Lublin.",
    seforim: "His legacy is chiefly preserved through teachings and stories of the Lelov dynasty.",
    yahrzeit: "7 Shevat",
    niftar: "5574 / 1814",
    sourceUrl: "https://hasidut.herzog.ac.il/en/story/rabbi-david-of-lelov-cannot-answer-the-lubliner/",
  },
  {
    slug: "ropshitz",
    city: "Ropshitz",
    yiddishCity: "ראפשיץ",
    country: "Poland",
    tzaddik: "Rabbi Naftali Tzvi Horowitz of Ropshitz",
    yiddishTzaddik: "דער ראפשיצער רב",
    aliases: ["Ropczyce", "Łańcut", "לאנצוט"],
    overview: "The Ropshitzer Rav was a leading Galician Rebbe, known for depth, warmth, and sharp insight. His kever is in Łańcut, Poland.",
    seforim: "Zera Kodesh · Ayalah Sheluchah · Imrei Shefer",
    yahrzeit: "11 Iyar",
    niftar: "5587 / 1827",
    sourceUrl: "https://nertzaddik.com/tzadik-info?id=3506",
  },
];

export function getCityGuide(slug: string) {
  return cityGuides.find((guide) => guide.slug === slug);
}
