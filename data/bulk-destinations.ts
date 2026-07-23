export type BulkDestination = {
  slug: string;
  city: string;
  yiddishCity: string;
  country: string;
  aliases: string[];
  summary: string;
};

type DestinationRow = [string, string, string, string, string[]?];

const rows: DestinationRow[] = [
  // Poland
  ["warsaw", "Warsaw", "ווארשא", "Poland", ["Warszawa"]],
  ["lublin", "Lublin", "לובלין", "Poland"],
  ["przysucha", "Przysucha", "פשיסחא", "Poland", ["Pshischa"]],
  ["kozienice", "Kozienice", "קוזניץ", "Poland"],
  ["gora-kalwaria", "Góra Kalwaria", "גער", "Poland", ["Ger"]],
  ["radomsko", "Radomsko", "ראדאמסק", "Poland"],
  ["warka", "Warka", "ווארקא", "Poland"],
  ["opatow", "Opatów", "אפטא", "Poland", ["Apta"]],
  ["ciechanow", "Ciechanów", "ציעחאנוב", "Poland"],
  ["tomaszow", "Tomaszów Mazowiecki", "טומאשוב", "Poland"],
  ["zelechow", "Żelechów", "זעליחוב", "Poland"],
  ["grodzisk", "Grodzisk Mazowiecki", "גרודזיסק", "Poland"],
  ["plock", "Płock", "פלוצק", "Poland"],
  ["piotrkow", "Piotrków Trybunalski", "פיוטרקוב", "Poland"],
  ["kalisz", "Kalisz", "קאליש", "Poland"],
  ["lodz", "Łódź", "לודז", "Poland"],
  ["czestochowa", "Częstochowa", "טשענסטאכאוו", "Poland"],
  ["tarnow", "Tarnów", "טארנא", "Poland"],
  ["debica", "Dębica", "דעמביץ", "Poland"],
  ["bobowa", "Bobowa", "באבאוו", "Poland"],
  ["dukla", "Dukla", "דוקלא", "Poland"],
  ["zmigrod", "Żmigród", "זשימיגראד", "Poland"],
  ["chrzanow", "Chrzanów", "כרזאנוב", "Poland"],
  ["oswiecim", "Oświęcim", "אושפיצין", "Poland", ["Auschwitz"]],
  ["zamosc", "Zamość", "זאמושץ", "Poland"],
  // Hungary
  ["mad", "Mád", "מאד", "Hungary"],
  ["tokaj", "Tokaj", "טוקאי", "Hungary"],
  ["szerencs", "Szerencs", "סערענטש", "Hungary"],
  ["sarospatak", "Sárospatak", "שאראשפאטאק", "Hungary"],
  ["miskolc", "Miskolc", "מישקאלץ", "Hungary"],
  ["nagykallo", "Nagykálló", "קאללא", "Hungary"],
  ["debrecen", "Debrecen", "דעברעצין", "Hungary"],
  ["nyiregyhaza", "Nyíregyháza", "נירעדהאז", "Hungary"],
  ["hajduboszormeny", "Hajdúböszörmény", "האידובאסארמען", "Hungary"],
  ["kallosemjen", "Kállósemjén", "קאללושעמיען", "Hungary"],
  ["tiszabercel", "Tiszabercel", "טיסאבערצעל", "Hungary"],
  ["abaujszanto", "Abaújszántó", "אבאוי סאנטא", "Hungary"],
  ["encs", "Encs", "ענץ", "Hungary"],
  ["mezuzombor", "Mezőzombor", "מעזא זאמבאר", "Hungary"],
  ["erdobenye", "Erdőbénye", "ערדאבעניע", "Hungary"],
  // Ukraine
  ["berdychiv", "Berdychiv", "בארדיטשוב", "Ukraine"],
  ["zhytomyr", "Zhytomyr", "זשיטאמיר", "Ukraine", ["Zhitomir"]],
  ["brody", "Brody", "בראד", "Ukraine"],
  ["zolochiv", "Zolochiv", "זלאטשוב", "Ukraine"],
  ["chortkiv", "Chortkiv", "טשארטקוב", "Ukraine"],
  ["husyatyn", "Husyatyn", "הוסיאטין", "Ukraine"],
  ["kremenets", "Kremenets", "קרעמעניץ", "Ukraine"],
  ["chernivtsi", "Chernivtsi", "טשערנאויץ", "Ukraine"],
  ["kolomyia", "Kolomyia", "קאלומייא", "Ukraine"],
  ["ivano-frankivsk", "Ivano-Frankivsk", "סטאניסלאב", "Ukraine", ["Stanislaw"]],
  ["ternopil", "Ternopil", "טערנאפאל", "Ukraine"],
  ["zbarazh", "Zbarazh", "זבאריז", "Ukraine"],
  ["buchach", "Buchach", "בוטשאטש", "Ukraine"],
  ["rohatyn", "Rohatyn", "ראהאטין", "Ukraine"],
  ["stryi", "Stryi", "סטרי", "Ukraine"],
  ["drohobych", "Drohobych", "דראהאביטש", "Ukraine"],
  ["sambir", "Sambir", "סאמבור", "Ukraine"],
  ["letychiv", "Letychiv", "לעטיטשוב", "Ukraine"],
  ["anipoli", "Anipoli", "אניפאלי", "Ukraine", ["Annopol"]],
  ["polonne", "Polonne", "פאלונע", "Ukraine"],
  ["shepetivka", "Shepetivka", "שעפעטיווקע", "Ukraine"],
  ["sharhorod", "Sharhorod", "שארהאראד", "Ukraine"],
  ["tulchyn", "Tulchyn", "טולטשין", "Ukraine"],
  ["balta", "Balta", "באלטא", "Ukraine"],
  // Slovakia
  ["kosice", "Košice", "קאשי", "Slovakia"],
  ["humenne", "Humenné", "הומענע", "Slovakia"],
  ["stropkov", "Stropkov", "סטראָפּקאָוו", "Slovakia"],
  ["svidnik", "Svidník", "סווידניק", "Slovakia"],
  ["presov", "Prešov", "פרעשאוו", "Slovakia"],
  ["komarno", "Komárno", "קאמארנא", "Slovakia"],
  ["nitra", "Nitra", "נייטרא", "Slovakia"],
  ["trnava", "Trnava", "טירנאו", "Slovakia"],
  // Romania
  ["sighet", "Sighet", "סיגעט", "Romania"],
  ["satu-mare", "Satu Mare", "סאטמאר", "Romania"],
  ["oradea", "Oradea", "גראסווארדיין", "Romania", ["Grosswardein"]],
  ["cluj", "Cluj", "קלויזנבורג", "Romania", ["Klausenburg"]],
  ["botosani", "Botoșani", "באטאשאן", "Romania"],
  ["iasi", "Iași", "יאס", "Romania"],
  ["radauti", "Rădăuți", "ראדאוץ", "Romania"],
  ["carei", "Carei", "קאריי", "Romania"],
  ["baia-mare", "Baia Mare", "באניא מארע", "Romania"],
  ["bistrita", "Bistrița", "ביסטריץ", "Romania"],
  // Czech Republic
  ["prague", "Prague", "פראג", "Czech Republic"],
  ["mikulov", "Mikulov", "ניקאלשבורג", "Czech Republic", ["Nikolsburg"]],
  ["holesov", "Holešov", "האלשאו", "Czech Republic"],
  ["boskovice", "Boskovice", "באסקאוויץ", "Czech Republic"],
  ["brno", "Brno", "ברין", "Czech Republic"],
  ["kolin", "Kolín", "קאלין", "Czech Republic"],
  ["prostejov", "Prostějov", "פראסטיץ", "Czech Republic"],
  // Lithuania
  ["vilnius", "Vilnius", "ווילנא", "Lithuania", ["Vilna"]],
  ["kaunas", "Kaunas", "קאוונע", "Lithuania", ["Kovno"]],
  ["kedainiai", "Kėdainiai", "קעידאן", "Lithuania"],
  ["telsiai", "Telšiai", "טעלז", "Lithuania"],
  ["zagarė", "Žagarė", "זשאגער", "Lithuania"],
  ["alytus", "Alytus", "אליטא", "Lithuania"],
  ["panevezys", "Panevėžys", "פאנעוועזש", "Lithuania"],
  ["siauliai", "Šiauliai", "שאוול", "Lithuania"],
  ["slabodka", "Slabodka", "סלאבאדקע", "Lithuania"],
  ["raseiniai", "Raseiniai", "ראסיין", "Lithuania"],
  // Belarus
  ["brest", "Brest", "בריסק", "Belarus"],
  ["pinsk", "Pinsk", "פינסק", "Belarus"],
  ["grodno", "Grodno", "גראָדנע", "Belarus"],
  ["minsk", "Minsk", "מינסק", "Belarus"],
  ["mir", "Mir", "מיר", "Belarus"],
  ["slonim", "Slonim", "סלונים", "Belarus"],
  ["baranovichi", "Baranovichi", "באראנאוויטש", "Belarus"],
  ["vitebsk", "Vitebsk", "וויטעבסק", "Belarus"],
  ["mogilev", "Mogilev", "מאהיליוו", "Belarus"],
  ["bobruisk", "Bobruisk", "באברויסק", "Belarus"],
];

export const bulkDestinations: BulkDestination[] = rows.map(([slug, city, yiddishCity, country, aliases = []]) => ({
  slug,
  city,
  yiddishCity,
  country,
  aliases,
  summary: "A Jewish heritage destination now in the White Glove directory. Exact kevarim, access, accommodations, food, minyanim, mikvaos, and local contacts are being verified before publication.",
}));

export function getBulkDestination(slug: string) {
  return bulkDestinations.find((destination) => destination.slug === slug);
}
