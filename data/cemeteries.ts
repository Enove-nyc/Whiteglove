export type Burial = {
  name: string;
  yiddishName: string;
  knownAs?: string;
  seforim?: string;
  yahrzeit?: string;
  note?: string;
};

export type Cemetery = {
  slug: string;
  city: string;
  yiddishCity: string;
  name: string;
  yiddishName: string;
  country: string;
  address: string;
  coordinates?: string;
  arrivalNotes: string[];
  accessNote?: string;
  accessContacts?: Array<{
    label: string;
    phone?: string;
    email?: string;
    note: string;
  }>;
  burials: Burial[];
  sourceUrl: string;
};

const featuredCemeteries: Cemetery[] = [
  {
    slug: "lizhensk",
    city: "Lizhensk (Leżajsk)",
    yiddishCity: "ליזענסק",
    name: "Lizhensk Jewish Cemetery",
    yiddishName: "בית החיים ליזענסק",
    country: "Poland",
    address: "Górna 16, 37-300 Leżajsk, Poland",
    coordinates: "50.251263, 22.421938",
    arrivalNotes: [
      "Navigate to Górna 16, the Jewish cemetery on the edge of the town.",
      "The ohel is the focal point of the cemetery; the graves of members of Reb Elimelech's family are recorded in and around the ohel.",
      "For 21 Adar, allow extra time and follow the current crowd, parking, and access arrangements.",
    ],
    burials: [
      { name: "Rabbi Elimelech Weisblum", yiddishName: "רבי אלימלך מליזענסק", knownAs: "Noam Elimelech", seforim: "נועם אלימלך", yahrzeit: "כ״א אדר · 5547 / 1787" },
      { name: "Rabbi Elazar Weisblum", yiddishName: "רבי אלעזר בן רבי אלימלך", knownAs: "Tzaddik of Chmielnik", yahrzeit: "1813", note: "A memorial inscription for Reb Elimelech's son is recorded at the ohel." },
      { name: "Rabbi Menachem Yissachar Weisblum", yiddishName: "רבי מנחם יששכר בן רבי אלימלך", yahrzeit: "1814", note: "A memorial inscription for Reb Elimelech's son is recorded at the ohel." },
      { name: "Rabbi Naftali Weisblum", yiddishName: "רבי נפתלי נכד רבי אלימלך", knownAs: "Tzaddik of Lizhensk", note: "Recorded among the family epitaphs at the ohel." },
      { name: "Rabbi Natan Yechezkel", yiddishName: "רבי נתן יחזקאל", note: "Son-in-law of Reb Elimelech; recorded among the family epitaphs at the ohel." },
      { name: "Rabbi Yisrael", yiddishName: "רבי ישראל", note: "Son-in-law of Reb Elimelech; recorded among the family epitaphs at the ohel." },
    ],
    sourceUrl: "https://sztetl.org.pl/en/node/188/114-cemeteries/19248-cmentarz-zydowski-w-lezajsku-ul-gorna",
  },
  {
    slug: "krakow-remuh",
    city: "Kraków",
    yiddishCity: "קראקא",
    name: "Remuh Cemetery · Old Jewish Cemetery",
    yiddishName: "בית החיים רמ״א · בית החיים הישן",
    country: "Poland",
    address: "Szeroka 40, 31-053 Kraków, Poland",
    coordinates: "50.053124, 19.944142",
    arrivalNotes: [
      "Navigate to Szeroka 40 in Kazimierz; the cemetery is directly beside the Remuh Synagogue.",
      "This is the old cemetery, not the new cemetery on Miodowa Street.",
      "Once inside, follow the cemetery layout and current local instructions to the individual matzeivos.",
    ],
    burials: [
      { name: "Rabbi Moshe Isserles", yiddishName: "רבי משה איסרליש", knownAs: "The Rema", seforim: "המפה · תורת חטאת · דרכי משה", yahrzeit: "ל״ג בעומר · 5332 / 1572" },
      { name: "Rabbi Yoel Sirkis", yiddishName: "רבי יואל סירקיש", knownAs: "The Bach", seforim: "בית חדש", yahrzeit: "1640" },
      { name: "Rabbi Yom Tov Lipmann Heller", yiddishName: "רבי יום טוב ליפמן העלער", knownAs: "Tosafos Yom Tov", seforim: "תוספות יום טוב", yahrzeit: "1654" },
      { name: "Rabbi Natan Nata Shapira", yiddishName: "רבי נתן נטע שפירא", knownAs: "Megaleh Amukos", seforim: "מגלה עמוקות", yahrzeit: "1633" },
      { name: "Rabbi Yehoshua ben Yosef", yiddishName: "רבי יהושע בן יוסף", knownAs: "Meginei Shlomo", seforim: "מגיני שלמה", yahrzeit: "1648" },
      { name: "Rabbi Mordechai Saba", yiddishName: "רבי מרדכי סבא", knownAs: "Singer", note: "Head of the Kraków Talmudic Academy after the Rema." },
      { name: "Rabbi Yosef Kac", yiddishName: "רבי יוסף כ״ץ", note: "Head of the Kraków Talmudic Academy." },
      { name: "Rabbi Yitzchak Yaakovovich", yiddishName: "רבי יצחק יעקובוביץ", knownAs: "Founder of the Izaak Synagogue" },
    ],
    sourceUrl: "https://gwzkrakow.pl/en/cemeteries/",
  },
  {
    slug: "krakow-new",
    city: "Kraków",
    yiddishCity: "קראקא",
    name: "New Jewish Cemetery · Miodowa",
    yiddishName: "בית החיים החדש קראקא · מיודובה",
    country: "Poland",
    address: "Miodowa 55, 31-036 Kraków, Poland",
    coordinates: "50.05414, 19.95046",
    arrivalNotes: [
      "Navigate to Miodowa 55 in Kazimierz; this is the new Jewish cemetery.",
      "Do not confuse it with the Remuh / old cemetery at Szeroka 40, which is a separate site several blocks away.",
      "Use the current cemetery entrance and follow local access instructions once you arrive.",
    ],
    accessNote: "This is a separate בית החיים from the Remuh cemetery. A current public שומר / cemetery-access number has not yet been verified for this location.",
    burials: [
      { name: "Rabbi Yosef Kornitzer", yiddishName: "רבי יוסף קורניצר", knownAs: "Rabbi of Kraków" },
      { name: "Rabbi Ozjasz Thon", yiddishName: "רבי עוזיאש טהון", knownAs: "Rabbi and communal leader" },
      { name: "Rabbi Aharon Elimelech", yiddishName: "רבי אהרן אלימלך", knownAs: "Tzaddik Aharon Elimelech" },
      { name: "Maurycy Gottlieb", yiddishName: "מאוריצי גוטליב", knownAs: "Jewish painter" },
      { name: "Leopold Kozłowski", yiddishName: "לעאפאלד קאזלאווסקי", knownAs: "Klezmer musician" },
    ],
    sourceUrl: "https://gwzkrakow.pl/en/cemeteries/",
  },
];

const cemeteryNames: Record<string, { name: string; yiddishName: string }> = {
  uman: { name: "Tziyun of Rebbe Nachman", yiddishName: "ציון רבינו נחמן מברסלב" },
  medzhybizh: { name: "Medzhybizh Old Jewish Cemetery", yiddishName: "בית החיים הישן מעזשיבוזש" },
  belz: { name: "Belz Jewish Cemetery", yiddishName: "בית החיים בעלז" },
  preshburg: { name: "Chatam Sofer Memorial", yiddishName: "ציון החתם סופר בפרעשבורג" },
  kerestir: { name: "Kerestir Jewish Cemetery", yiddishName: "בית החיים קערעסטיר" },
  munkatch: { name: "Munkatch Old Jewish Cemetery", yiddishName: "בית החיים הישן מונקאטש" },
  rymanow: { name: "Rymanow Jewish Cemetery", yiddishName: "בית החיים רימינוב" },
  dynow: { name: "Dynów Jewish Cemetery", yiddishName: "בית החיים דינוב" },
  sanz: { name: "Sanz New Jewish Cemetery", yiddishName: "בית החיים החדש צאנז" },
  ijhel: { name: "Ijhel Old Jewish Cemetery", yiddishName: "בית החיים הישן איהעל" },
  liska: { name: "Liska Jewish Cemetery", yiddishName: "בית החיים ליסקא" },
};

const guideCemeteries: Cemetery[] = cityGuides
  .filter((guide) => guide.graveAddress && cemeteryNames[guide.slug])
  .map((guide) => ({
    slug: guide.slug,
    city: guide.city,
    yiddishCity: guide.yiddishCity,
    name: cemeteryNames[guide.slug].name,
    yiddishName: cemeteryNames[guide.slug].yiddishName,
    country: guide.country,
    address: guide.graveAddress!,
    coordinates: guide.graveCoordinates,
    arrivalNotes: guide.findingNotes ?? ["Use the exact map pin and confirm current cemetery access before leaving for the kever."],
    accessContacts: guide.accessContacts ?? (guide.accessContact ? [guide.accessContact] : undefined),
    accessNote: (guide.accessContacts?.length || guide.accessContact)
      ? "Current public shomer / cemetery-access contacts are listed below. Please confirm access before traveling."
      : "A current public שומר / cemetery-access number has not yet been verified for this בית החיים. Confirm access before traveling.",
    burials: [{
      name: guide.tzaddik,
      yiddishName: guide.yiddishTzaddik,
      seforim: guide.seforim,
      yahrzeit: `${guide.yahrzeit} · ${guide.niftar}`,
    }],
    sourceUrl: guide.sourceUrl,
  }));

export const cemeteries: Cemetery[] = [...featuredCemeteries, ...guideCemeteries];

export function getCemetery(slug: string) {
  return cemeteries.find((cemetery) => cemetery.slug === slug);
}
import { cityGuides } from "@/data/city-guides";
