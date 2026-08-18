// Bulk kevarim — batch 23. Four more directory towns.
//
// Batch 22 said every batch after it should be expected to hold no named
// kevarim. That held for three of these four; Oradea broke it, with a chief
// rabbi of the town named in the survey of its Orthodox ground.
//
// TWO NAMES ARE DELIBERATELY NOT HERE.
//
// Nitra does not list Reb Shmuel Dovid Ungar. People look for the Nitrer Rov
// in Nitra and he is not there — after the war his son brought him to
// Piešťany, his birthplace, and buried him beside his father. The Nitra
// listing says so, because being told on the page is better than being told at
// the gate.
//
// Oradea does not list the four rabbonim the survey names in its oldest
// ground. One of them is given as niftar in 1773 and that cemetery took its
// first Jewish burial in 1801. When a source contradicts itself on a date, the
// names go unprinted — the same rule that kept "the Levush" out of Mád in
// batch 16 and the Chasam Sofer out of Kashau in batch 21.
//
// Dębica names nobody either. The town had its own rebbes — Reb Reuven
// Horowitz, a grandson of the Ropshitzer, was the first of them — but no
// source found says where any of them lies, and the ground was emptied of its
// stones twice over. A name would have to be read off a matzevah by somebody
// standing there.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries23: Cemetery[] = [
  {
    slug: "nitra-cemetery",
    city: "Nitra",
    yiddishCity: "נייטרא",
    name: "Nitra — the Jewish cemetery",
    yiddishName: "נייטרא — בית החיים",
    country: "Slovakia",
    address: "Jewish cemetery, Hviezdoslavova trieda, on the hill by the Klokočina district, Nitra, Nitra Region, Slovakia",
    airportRef: "48.306, 18.087",
    arrivalNotes: [
      "THE NITRER ROV IS NOT BURIED HERE. Reb Shmuel Dovid Ungar, rosh yeshiva of Nitra, was niftar in hiding in February 1945; after the war his son brought him to Piešťany, his birthplace, and buried him next to his father. Piešťany is about seventy kilometres west and is a separate journey.",
      "The cemetery itself is on the hill by the Klokočina district, off Hviezdoslavova trieda. There is no sign on the road, but the gate carries Jewish symbols.",
      "IT IS WALLED AND THE GATE LOCKS, and the sexton holds the key — the survey gives him as Viliam Glück, at an address in Hlohovec rather than in Nitra itself, so arrange the visit before travelling instead of turning up at the wall.",
      "It is one of the best-kept Jewish cemeteries in Slovakia — around five thousand graves, most of the stones still standing where they were set, and restoration work has been done on them. There is an ohel on the ground, a chapel, and the sexton's house.",
      "The ground is divided into an Orthodox part and a Neolog part, with a separate section for women who were niftar in childbirth. Knowing which part you want halves the walking.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/slovakia/nitra-mestsky-urad",
  },
  {
    slug: "oradea-cemeteries",
    city: "Oradea (Grosswardein)",
    yiddishCity: "גראסווארדיין",
    name: "Grosswardein — the Jewish cemeteries",
    yiddishName: "גראסווארדיין — בתי החיים",
    country: "Romania",
    address: "Orthodox Jewish cemetery, Toamnei 3, Oradea, Bihor County, Romania",
    airportRef: "47.056, 21.929",
    arrivalNotes: [
      "THERE ARE THREE GROUNDS AND YOU HAVE TO SAY WHICH ONE. The Orthodox cemetery is on Toamnei 3, opened 1876. The oldest Orthodox ground is out east on Războieni 88–90, in use from 1801. The Neolog cemetery is on Umbrei 2, opened 1881. Each has its own keyholder.",
      "All three are entered with permission rather than freely, and arrangements go through the kehilla in the city at Mihai Viteazul 4. Telephone ahead: +40 259 434 843.",
      "The two Orthodox grounds are in good condition for their age — thousands of stones each, under a quarter of them down. The oldest ground on Războieni is the overgrown one; vegetation has covered a great deal of it, and it holds a taharah house and an ohel.",
      "Each of the three has a section set aside for rabbonim and one for kohanim, which is where to start rather than walking the rows.",
      "The Războieni ground has never been vandalised and is regularly visited by groups; the last burial in it was in 1952.",
    ],
    burials: [
      {
        name: "Rabbi Moshe Tzvi Fuchs",
        yiddishName: "רבי משה צבי פוקס",
        knownAs: "Chief rabbi of Grosswardein",
        yahrzeit: "5671 / 1911",
        note: "Named in the survey of the Orthodox cemetery on Toamnei as the chief rabbi of the city buried there, recorded in the Hungarian spelling Mose Hersch Fuchs.",
      },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/oradea-bihor-county-transylvania",
  },
  {
    slug: "botosani-cemeteries",
    city: "Botoșani",
    yiddishCity: "באטאשאן",
    name: "Botoșani — the Jewish cemeteries",
    yiddishName: "באטאשאן — בתי החיים",
    country: "Romania",
    address: "Jewish cemetery, Bulevardul Mihai Eminescu 403, Botoșani, Botoșani County, Moldavia, Romania",
    airportRef: "47.749, 26.670",
    arrivalNotes: [
      "GO TO MIHAI EMINESCU 403. Two of the town's three grounds are there, one seventeenth-century and one nineteenth-century, and one man holds the key to both — the survey gives him as Iordache Ilie, living at that same number. Entry is with permission, and that is the address to ask at.",
      "The third and oldest ground, on Penes Curcanul 6, is shut. It is walled, the gate locks, and its key is held separately at number 22 on the same street. Only twenty to a hundred stones are still visible in it and most of those are down.",
      "The nineteenth-century ground is the large one — over five thousand graves — but more than three quarters of its matzevos are toppled or broken, so finding a particular stone is a long job rather than a quick one.",
      "Botoșani is one of the places where Romania's rare wooden grave markers have survived, which is worth knowing before you walk past one.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/botosani-botosani-judet",
  },
  {
    slug: "debica-dembitz-cemetery",
    city: "Dębica (Dembitz)",
    yiddishCity: "דעמביץ",
    name: "Dembitz — the Jewish cemetery",
    yiddishName: "דעמביץ — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, ulica Cmentarna, Dębica, Subcarpathian Voivodeship, Poland",
    airportRef: "50.052, 21.411",
    arrivalNotes: [
      "The cemetery is on ulica Cmentarna. It was opened around the turn of the seventeen hundreds and served Pilzno and the towns around as well as Dembitz itself; the oldest stone that can still be read is from 1791 and the last burial was in 1945.",
      "THE STONES DO NOT STAND OVER THE PEOPLE. The Germans took the matzevos to pave the town's streets and pulled down the wall for building material. Survivors from Dembitz recovered several hundred after the war and brought them back, and the broken pieces were built into two lapidariums. What you walk among is a rescued collection, not a burial map.",
      "Part of the ground was turned into a playground under the communists, and the wall they demolished has never been rebuilt as it was. The site was fenced again in 1983 and re-sanctified in 1996, so it is tended, but expect an open field rather than a kept cemetery.",
      "Dembitz had its own line of rebbes, beginning with Reb Reuven Horowitz, a grandson of the Ropshitzer. No source found says where any of them lies, and this listing is not going to guess for you.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/poland/debica",
  },
];
