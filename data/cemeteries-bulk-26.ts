// Bulk kevarim — batch 26. Four more directory towns.
//
// A NAME THAT ALMOST WENT IN AS A BURIAL AND MUST NOT. The survey of Bistrița
// names Reb Meir Spitz, rov of the town from 1912, as its notable Jewish
// resident — and in the same paragraph records that the Jews of Bistrița were
// put into the ghetto in May 1944 and deported to Auschwitz on the second and
// sixth of June. He was murdered there. He is not in that cemetery and no
// listing on this site is going to put him in it. The page says where he
// went instead.
//
// Two of these four are pages about access rather than about kevarim, and both
// are genuinely useful for it: Humenné is a hill with a locked gate and one
// man's telephone number, and its stones have been numbered and transcribed.
// Stryi is the opposite — there is no cemetery left to enter at all.
//
// Kėdainiai's two sources disagree about whether anything is standing in the
// old ground. The listing gives both readings rather than choosing.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries26: Cemetery[] = [
  {
    slug: "humenne-cemetery",
    city: "Humenné",
    yiddishCity: "הומענע",
    name: "Humenné — the Orthodox Jewish cemetery",
    yiddishName: "הומענע — בית החיים החרדי",
    country: "Slovakia",
    address: "Orthodox Jewish cemetery, Židovská hora, outside Humenné, Prešov Region, Slovakia",
    airportRef: "48.936, 21.916",
    arrivalNotes: [
      "IT IS ON A HILL OUTSIDE THE TOWN CALLED ŽIDOVSKÁ HORA — the Jewish hill — and you turn off the public road straight into it. Part of the ground is behind wire fencing and the gate is locked.",
      "ONE MAN HOLDS THE KEY and keeps the ground. Older records give him as Mr Lebitzky, on +421 917 796 185, but that number was published in 2012 and may well have moved on. Ask in the town if it does not answer, and arrange the visit before travelling either way.",
      "THE GRAVES ARE NUMBERED. In 2006 the Heritage Foundation for the Preservation of Jewish Cemeteries restored and numbered seven hundred of them, photographed and transcribed two hundred and ninety-two, and published a booklet of the names and what the stones say. That booklet is how you find a particular kever here.",
      "About nine hundred matzevos in all, in marble, granite and limestone, inscribed in Hebrew, Slovak and German.",
      "THE OLD PART IS TO YOUR LEFT AS YOU COME IN and is barely walkable — it was left to itself for many years and has not been cleared the way the rest has.",
      "The survey dates the ground to the fifteenth century. That would make it one of the oldest in the region and it is worth confirming on the spot rather than repeating; the stones that have been read are very much later.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/slovakia/humenne",
  },
  {
    slug: "kedainiai-cemeteries",
    city: "Kėdainiai (Keidan)",
    yiddishCity: "קעידאן",
    name: "Keidan — the Jewish cemeteries",
    yiddishName: "קעידאן — בתי החיים",
    country: "Lithuania",
    address: "Jewish cemeteries, Lakštingalų and Kanapinskio streets, just outside Kėdainiai, Kaunas County, Lithuania",
    airportRef: "55.288, 23.975",
    arrivalNotes: [
      "TWO GROUNDS, JUST OUTSIDE THE TOWN, on Lakštingalų and Kanapinskio. They were one cemetery until they were divided — a map from 1933 still shows the single ground — and each now has its own boundary and its own protection.",
      "The newer one is where the stones are: getting on for six hundred matzevos, the oldest inscription from the eighteen-sixties and probably older ground than that.",
      "THE OLD GROUND IS ON A BLUFF ABOVE THE SMILGA, and the river is what destroyed it. More than half of it went to flooding and to vandalism. Sources disagree about what is left — one says nothing stands and there is only a monument in a fenced field, another says about a hundred stones are still up, in every condition from good to unreadable. Go expecting the monument and treat anything standing as a bonus.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/lithuania/kedainiai",
  },
  {
    slug: "stryi-cemetery-site",
    city: "Stryi",
    yiddishCity: "סטרי",
    name: "Stryi — the site of the Jewish cemetery",
    yiddishName: "סטרי — פלאץ פון בית החיים",
    country: "Ukraine",
    address: "Site of the Jewish cemetery, corner of Korchaka and Zalizniaka streets, Stryi, Lviv Oblast, Ukraine",
    airportRef: "49.262, 23.855",
    arrivalNotes: [
      "THERE IS NOTHING TO ENTER. The cemetery was opened in the early seventeen hundreds and it is gone — taken down around the war and then built over under the Soviets. Blocks of flats stand on it now, at the crossing of Korchaka and Zalizniaka.",
      "A memorial sign marks the place, put up both for the cemetery and for the rabbonim who lay in it. That sign is the whole of what there is to stand at.",
      "The ruined synagogue in the town is a separate site and volunteers have worked on clearing it. If you are going to Stryi at all, that is the other thing to see.",
      "Stryi is on the road south from Lviv toward the Carpathians and is almost always passed through rather than travelled to.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/stryy-old-jewish-cemetery/",
  },
  {
    slug: "bistrita-cemetery",
    city: "Bistrița (Bistritz)",
    yiddishCity: "ביסטריץ",
    name: "Bistritz — the Jewish cemetery",
    yiddishName: "ביסטריץ — בית החיים",
    country: "Romania",
    address: "Jewish cemetery, Strada Ghinzii 48, Bistrița, Bistrița-Năsăud County, Transylvania, Romania",
    airportRef: "47.133, 24.500",
    arrivalNotes: [
      "The address is Ghinzii 48. It is fenced, the gate locks, and entry is with permission rather than open — so it is arranged in advance, not walked into.",
      "An Orthodox ground of the eighteen-hundreds, three hundred metres by a hundred, with thousands of stones still visible on it. There is no landmark or marker on the road to tell you what it is.",
      "REB MEIR SPITZ IS NOT BURIED HERE, and people look for him. He was rov of Bistritz from 1912 until 1944, when the Jews of the town were put into the ghetto in May and deported to Auschwitz on the second and sixth of June. He was murdered there and has no kever.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/bistrita-bistrita-county",
  },
];
