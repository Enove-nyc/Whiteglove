// Bulk kevarim — batch 17. Four more directory towns, researched.
//
// Same rules as batch 16. Every fact is from a named public source; nothing is
// filled in from general knowledge; no grave GPS is invented; and where a
// source is uncertain the page says so rather than choosing for the reader.
//
// TWO OF THESE FOUR ARE MOSTLY DESTROYED GROUND, and both say so in the first
// arrival note. A page that reads like a pilgrimage when the cemetery is under
// asphalt sends somebody a very long way for nothing — see Ciechanów in batch
// 16 for the same problem and the same answer.
//
// Slugs are prefixed with the directory town's own slug, so the matching rule
// in data/destination-database.ts links them without a hand-written pairing.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries17: Cemetery[] = [
  {
    slug: "husyatyn-ohel",
    city: "Husyatyn",
    yiddishCity: "הוסיאטין",
    name: "Husyatyn — ohel of the first Husiatiner Rebbe",
    yiddishName: "הוסיאטין — אוהל האדמו״ר הראשון מהוסיאטין",
    country: "Ukraine",
    address: "Ternopilska 4, Husyatyn, Chortkiv Raion, Ternopil Oblast, Ukraine",
    airportRef: "49.070, 26.208",
    arrivalNotes: [
      "THE OHEL IS WHAT SURVIVES, AND ALMOST NOTHING ELSE. The cemetery was founded in 1730; its fence and every one of its matzevos were destroyed in the war, and the ground has since been buried under soil, asphalt and rubbish. The ohel is described as the only object left of the Jewish past of this ground.",
      "It stands at Ternopilska 4, so navigate to the street rather than looking for a cemetery — there is no cemetery left to see from the road.",
      "The family restored the kevarim inside it in 2007, which is why it is in the state it is.",
    ],
    burials: [
      {
        name: "Rabbi Mordechai Shraga Feivish Friedman",
        yiddishName: "רבי מרדכי שרגא פייביש פרידמאן",
        knownAs: "The first Husiatiner Rebbe",
        yahrzeit: "5654 / 1894",
        note: "1835–1894, youngest son of Reb Yisrael Friedman of Ruzhin. He came to Husiatyn at thirty, in 1865, and built the chassidus here. Later Husiatiner rebbes are buried elsewhere — this is the first.",
      },
      {
        name: "Rabbi Shalom Yosef Friedman",
        yiddishName: "רבי שלום יוסף פרידמאן",
        knownAs: "Son of the first Husiatiner Rebbe",
        note: "Buried in the same ohel as his father.",
      },
    ],
    sourceUrl: "https://jewua.org/husiatyn/",
  },
  {
    slug: "grodno-shimon-shkop",
    city: "Grodno",
    yiddishCity: "גראָדנע",
    name: "Grodno — kever of Reb Shimon Shkop",
    yiddishName: "גראדנע — ציון רבי שמעון שקאפ",
    country: "Belarus",
    address: "New Jewish cemetery, Zaniemanski Forshtat, across the Neman, Grodno, Belarus",
    airportRef: "53.678, 23.830",
    arrivalNotes: [
      "There is more than one Jewish cemetery in Grodno and the older ones did not survive. The one you want is the newest, on the far side of the Neman in the Zaniemanski Forshtat quarter — being across the river is why it was spared.",
      "Navigate across the Neman first and ask locally for the Jewish cemetery in Zaniemanski; the older sites in the city centre will not have what you came for.",
    ],
    burials: [
      {
        name: "Rabbi Shimon Yehuda HaKohen Shkop",
        yiddishName: "רבי שמעון יהודה הכהן שקאפ",
        knownAs: "Reb Shimon Shkop, rosh yeshiva of Grodno",
        seforim: "שערי יושר",
        yahrzeit: "5700 / 1939",
        note: "1860–1939. Rosh yeshiva of Shaar HaTorah in Grodno and one of the shapers of the Lithuanian way of learning; the Shaarei Yosher is his. He was niftar in Grodno in October 1939, weeks after the war began, and is buried here.",
      },
    ],
    sourceUrl: "https://kevarim.com/rabbi-shimon-yehuda-shkop/",
  },
  {
    slug: "satu-mare-orthodox-cemetery",
    city: "Satu Mare",
    yiddishCity: "סאטמאר",
    name: "Satu Mare — the Orthodox Jewish cemetery",
    yiddishName: "סאטמאר — בית החיים החרדי",
    country: "Romania",
    address: "Orthodox Jewish cemetery, Satu Mare, Satu Mare County, Transylvania, Romania",
    airportRef: "47.792, 22.885",
    arrivalNotes: [
      "THE SATMAR ROV IS NOT BURIED HERE. Reb Yoel Teitelbaum lies in Kiryas Joel, New York. People search the name Satmar and arrive expecting his kever; what is in this ground is the town's own rabbonim, and a rebbetzin of the Teitelbaum family.",
      "The cemetery was laid out at the start of the twentieth century. Access is open with permission, and the first ohel stands at the end of the wide paved path in from the gate, past the Holocaust memorial just inside.",
      "Over 2,300 readable matzevos here have been photographed and catalogued, so a specific kever can be located before you travel rather than searched for on the day.",
    ],
    burials: [
      {
        name: "Rabbi Yehuda Grunwald",
        yiddishName: "רבי יהודה גרינוואלד",
        knownAs: "Av beis din of Satmar, 1898–1920",
        note: "Rov of Satmar for over twenty years until his petirah, and the head of its yeshiva. Members of the Grunwald family are buried around him.",
      },
    ],
    sourceUrl: "http://szatmar.us/db/ortodox.html",
  },
  {
    slug: "zamosc-maggid-dubno",
    city: "Zamość",
    yiddishCity: "זאמושץ",
    name: "Zamość — kever of the Maggid of Dubno",
    yiddishName: "זאמושץ — ציון המגיד מדובנא",
    country: "Poland",
    address: "Jewish cemetery, Prosta, Zamość, Lublin Voivodeship, Poland",
    coordinates: "50.714181, 23.265108",
    airportRef: "50.717, 23.252",
    arrivalNotes: [
      "LITTLE IS LEFT STANDING. The old cemetery, on the hill about 250 metres north of the market square, was used as a market garden during the war; two free-standing matzevos and several dozen broken fragments are all that survive of it. At the site on Prosta there is a monument built from matzevo fragments.",
      "Sources place the Maggid of Dubno in one of the town's two Jewish cemeteries but do not agree which. Ask locally before you go, rather than assuming — this is the one detail worth settling in advance.",
      "An ohel was put up in 1995 over the kever of Reb Yosef Mordechai Leiner, on the initiative of Rabbi Edgar Gluck.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [
      {
        name: "Rabbi Yaakov ben Wolf Kranz",
        yiddishName: "רבי יעקב בן זאב קראנץ",
        knownAs: "The Maggid of Dubno",
        yahrzeit: "5565 / 1804",
        note: "The Dubner Maggid, whose meshalim are quoted wherever chassidus and mussar are taught. He was niftar in Zamość at sixty-three and is buried in the town — see the note above about which of the two grounds.",
      },
      {
        name: "Rabbi Yosef Mordechai Leiner",
        yiddishName: "רבי יוסף מרדכי ליינער",
        note: "An ohel was erected over his kever here in 1995.",
      },
    ],
    sourceUrl: "https://zabytek.pl/en/obiekty/g-270087",
  },
];
