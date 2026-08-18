// Bulk kevarim — batch 30. THREE towns, not four, and that is the report.
//
// Six of the fourteen towns still bare were searched for this batch and gave
// nothing: Hajdúböszörmény, Tiszabercel, Mezőzombor, Encs, Letychiv, Vitebsk.
// In several cases the search returns a neighbouring town's ohel instead —
// Hajdúnánás for Hajdúböszörmény, Bodrogkeresztúr for Mezőzombor — which is
// exactly how a wrong kever gets onto a page. They stay bare.
//
// What did come out is good. Alytus and Mogilev are both towns where the
// stones have been catalogued and published, which is the single most useful
// thing that can be true of a cemetery on this site: it turns a visit from a
// search into an appointment.
//
// A CORRECTION TO BATCH 27 GOES WITH THIS FILE. The Szerencs listing said the
// sources could not settle whether the ohel's Reb Amram Billitzer and the
// kehilla's first rov were one man or two. A source found while researching
// this batch gives both with dates — Reb Amram Yishai HaLevi Billitzer,
// 1834–1889, and his son Reb Pinchas HaLevi Billitzer, 1860–1913 — so they are
// one man and his son, and the Szerencs entry now says so.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries30: Cemetery[] = [
  {
    slug: "erdobenye-cemetery",
    city: "Erdőbénye",
    yiddishCity: "ערדאבעניע",
    name: "Erdőbénye — the Jewish cemetery",
    yiddishName: "ערדאבעניע — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Petőfi utca 13, Erdőbénye, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.222, 21.352",
    arrivalNotes: [
      "IT IS INSIDE THE TOWN'S PUBLIC CEMETERY, fenced off as its own section, at Petőfi utca 13. Do not look for a separate Jewish cemetery on the edge of the village — go to the town cemetery and find the enclosed part.",
      "It is well kept, which is not the rule in the Zemplén.",
      "The kehilla here was tied to Olaszliszka next door, and by marriage as well as by road: Reb Chaim Friedlander, rov of Erdőbénye, was the son-in-law of the Liska, Reb Tzvi Hirsh Friedmann. Anybody travelling to Liska is twenty minutes away.",
      "A hundred and twenty Jews were living in Erdőbénye in the spring of 1944. They were taken to the ghetto in Tokaj, then to the collection camp at Ijhel, and from there to Auschwitz.",
    ],
    burials: [
      {
        name: "Dovid Yitzchok Teitelbaum",
        yiddishName: "דוד יצחק טייטלבוים",
        knownAs: "Of the Teitelbaum family",
        yahrzeit: "5677 / 1917",
        note: "Born about 1850. A wine merchant of Erdőbénye and a descendant of the Teitelbaum family; his matzevah records that he learned alongside his trade. His kever is in this cemetery. He was not a rov and this listing does not make him one.",
      },
    ],
    sourceUrl: "https://zemplenizsidosag.hu/erdobenye-en/",
  },
  {
    slug: "alytus-cemeteries",
    city: "Alytus",
    yiddishCity: "אליטא",
    name: "Alytus — the Jewish cemeteries",
    yiddishName: "אליטא — בתי החיים",
    country: "Lithuania",
    address: "Old Jewish cemetery, Alytus I, on the right bank of the Nemunas beside the Orthodox cemetery, Alytus, Alytus County, Lithuania",
    airportRef: "54.397, 24.045",
    arrivalNotes: [
      "THE RIVER SPLITS THE TOWN AND IT SPLIT THE KEHILLA'S GROUND. The cemetery to go to is in Alytus I, on the right bank of the Nemunas, next to the Russian Orthodox cemetery. The Old Town on the left bank had its own burial ground, on Smėlio street, with a stream running between it and the houses.",
      "THE WALL IS THE ORIGINAL. An irregular stone wall, not rebuilt, goes round the ground, and the cemetery is on Lithuania's register of protected immovable heritage.",
      "Several hundred are buried here and most of them have no marker. Around two hundred stones and fragments survive, with up to fifty of them near the entrance. Sources give the oldest as 1755 or 1790 and do not agree; the last is 1937, and burials went on until 1941.",
      "EVERY READABLE STONE HAS BEEN PUBLISHED. A book documenting the ground came out online in 2020 — a map of the cemetery and photographs and translations of the ninety-nine stones whose epitaphs can still be read in whole or in part. It was made by the town's own gymnasium and its pupils together with the municipality, Maceva and the Alytus museum. Read it before travelling.",
    ],
    burials: [],
    sourceUrl: "https://jewish-heritage-europe.eu/2020/03/31/lithuania-new-online-book/",
  },
  {
    slug: "mogilev-cemetery",
    city: "Mogilev",
    yiddishCity: "מאהיליוו",
    name: "Mogilev — the Jewish cemetery",
    yiddishName: "מאהיליוו — בית החיים",
    country: "Belarus",
    address: "Jewish cemetery, Mogilev, Mogilev Region, Belarus",
    airportRef: "53.917, 30.333",
    arrivalNotes: [
      "THE BURIALS ARE CATALOGUED AND ONLINE. That happened in 2014, and it is the reason to plan a visit here in advance rather than walking rows: over five thousand graves, and the list of who is in them can be read from home.",
      "It is walled and it is watched. A concrete wall was built round the whole ground from 2000 with money raised abroad, along with a building for the guards, and twenty-five of the old kevorim were restored then. Roughly a sixth of the cemetery has since been restored again.",
      "IT IS CLOSED TO NEW BURIALS except on plots already fenced by a family. The ground is not for sale and nothing may be built on it.",
      "In 2019 it was given the status of a historical and memorial burial place — the only Jewish cemetery in Belarus that has it. That is real protection, and it is why this ground is in better condition than most in the country.",
      "The oldest kevorim are the worst off. Many of the later monuments are substantial stonework and stand; the early ones are worn down or gone. Upkeep is done by volunteers, by donors abroad and by families.",
    ],
    burials: [],
    sourceUrl: "https://jewish-heritage-europe.eu/have-your-say/the-mogilev-jewish-cemetery/",
  },
];
