// Bulk kevarim — batch 31. Three towns, and all three had been searched and
// rejected before.
//
// Cluj failed twice, Vitebsk twice, Minsk once back at batch 21. Each of them
// came out this time because the search went at the survey directly instead of
// at the town's name — the general web pages for a city return the city's
// history, and the cemetery record has to be asked for on its own. That is the
// method note worth keeping: a town that gives nothing is not always a town
// with nothing.
//
// NOBODY IS NAMED IN THESE THREE, and in Cluj that is a deliberate omission
// rather than an empty field. Four cemeteries there hold five ohels between
// them and no source found says which rov is in which. Reb Moshe Shmuel
// Glasner, the rov people ask about, led the kehilla until the early
// nineteen-twenties and then left for Eretz Yisroel; no source found puts his
// kever in Cluj, so this listing does not.
//
// Minsk's surveys name three rabbonim in the city's grounds without saying
// which ground, and most of those grounds are under a university, a square and
// a road. Naming a man without being able to say where he lies would send
// somebody to dig at a bus stop.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries31: Cemetery[] = [
  {
    slug: "cluj-cemeteries",
    city: "Cluj-Napoca (Klausenburg)",
    yiddishCity: "קלויזענבורג",
    name: "Klausenburg — the Jewish cemeteries",
    yiddishName: "קלויזענבורג — בתי החיים",
    country: "Romania",
    address: "New Orthodox Jewish cemetery, Calea Turzii 154–156, Cluj-Napoca, Cluj County, Transylvania, Romania",
    airportRef: "46.755, 23.590",
    arrivalNotes: [
      "FOUR CEMETERIES, AND TWO OF THEM ARE ON THE SAME ROAD — say which one before anybody sets out. The old Orthodox ground is at Calea Turzii 116, opened 1892. The new Orthodox ground is further along the same road at 154–156, opened 1927. The Neolog cemetery is on Șoimului, opened 1925, with its entrance at number 1.",
      "FIVE OHELS STAND ACROSS THE FOUR GROUNDS, holding rabbonim of the city. No source found says which rov is in which ohel, so this listing names none of them — ask at the kehilla in the city rather than walking four cemeteries.",
      "About seven thousand kevorim in all. Entry is by arrangement rather than open, and the kehilla in Cluj is the address for it.",
      "REB MOSHE SHMUEL GLASNER IS NOT PLACED HERE. He led the Orthodox kehilla of Klausenburg from 1878 into the early nineteen-twenties and then left for Eretz Yisroel. No source found says his kever is in this city, and people ask.",
    ],
    burials: [],
    sourceUrl: "https://baabel.ro/2017/01/povestea-cimitirelor-evreiesti-din-cluj-intr-un-volum-de-gyorgy-gaal/",
  },
  {
    slug: "minsk-cemeteries",
    city: "Minsk",
    yiddishCity: "מינסק",
    name: "Minsk — the Jewish cemeteries",
    yiddishName: "מינסק — בתי החיים",
    country: "Belarus",
    address: "Jewish cemetery, Sukhaya street, Minsk, Belarus",
    airportRef: "53.902, 27.562",
    arrivalNotes: [
      "MOST OF WHAT MINSK BURIED IS UNDER THE CITY. The ground by what is now the central square was closed in 1846 and built over; when the square was rebuilt in 2002 the remains of twenty-one Jews came up and were reburied. A mid-nineteenth-century cemetery went under the Belarusian State University in the nineteen-twenties, and fragments of its matzevos surfaced again during metro works around 2018.",
      "THE ONE THAT SURVIVES AS A CEMETERY is on Sukhaya street. It has been vandalised — nineteen matzevos were destroyed in one attack in 2002 — but it is a cemetery you can walk rather than a site you stand beside.",
      "THE YAMA IS THE OTHER PLACE PEOPLE COME TO. The Pit memorial, put up in 1946, marks five thousand Jews murdered on the second of March 1942. It was the first Holocaust memorial in the Soviet Union to carry an inscription in Yiddish, which is why it matters beyond Minsk.",
      "Minsk's surveys name Reb Yechiel Halperin of the Seder HaDoros, Reb Yerucham Yehuda Leib Perlman and Reb Binyomin Makovsky among the rabbonim buried in the city, but do not say in which of its grounds — and several of those grounds are now a university, a square and a road. This listing will not point at a spot it cannot stand behind.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/belarus/minsk",
  },
  {
    slug: "vitebsk-cemetery",
    city: "Vitebsk",
    yiddishCity: "וויטעבסק",
    name: "Vitebsk — the Jewish cemetery",
    yiddishName: "וויטעבסק — בית החיים",
    country: "Belarus",
    address: "Jewish cemetery, Vitebsk, Vitebsk Region, Belarus",
    airportRef: "55.192, 30.205",
    arrivalNotes: [
      "IT IS BIG AND IT IS IN THREE PARTS — around six thousand three hundred kevorim, split into three sections of roughly two and a half, two and a half, and one and a half thousand. Know which section before you start walking.",
      "THE OLDER GRAVES ARE ON THE RIGHT OF THE CENTRE, and many of them were moved here from other grounds around the city. The kevorim on the left are from before the revolution and between the wars, and a great many of those need restoring rather than merely finding.",
      "EIGHTY-ONE YEARS WITH NOBODY WATCHING. From 1918 until 1999 the cemetery had no security at all, and most of the pre-revolutionary matzevos were broken up or taken — the granite and marble ones went into the insides of buildings. The fence and gate were rebuilt between 1993 and 1997.",
      "The third section was used in secret from the nineteen-sixties on, during the years when burying here was forbidden. Kevorim from that period are not where the records would put them.",
      "The Vitebsk Foundation, at the museum on Gogol street, house 17, flat 24, is the address that holds more than the surveys do.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/belarus/vitebsk",
  },
];
