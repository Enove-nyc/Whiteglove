// Bulk kevarim — batch 32. Four towns, and THREE OF THEM I CALLED BARE TWO
// BATCHES AGO.
//
// Batch 30 reported that Hajdúböszörmény, Tiszabercel and Letychiv had been
// searched and given nothing. That was true of the search, not of the towns.
// All three have full surveys — Hajdúböszörmény's has three ohels, four
// hundred and twenty-four numbered graves and a chevra kadisha founded in
// 1846 — and they were found by asking the ESJF survey database for the town's
// URL directly instead of asking the web about the town. Two batches running
// have now shown the same thing: a search that returns nothing is a fact about
// the search.
//
// FIRST BATCH WITH REAL GPS. These four carry surveyed coordinates rather than
// a town-centre point, so they are the first listings on the site a traveller
// can navigate to rather than search for. Everything before this ranks airports
// off a town pin and gives a street.
//
// Encs, Mezőzombor, Svidník and Carei were probed the same way and have no
// survey at those addresses. They stay bare — for now, and with less
// confidence than before.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries32: Cemetery[] = [
  {
    slug: "hajduboszormeny-cemetery",
    city: "Hajdúböszörmény",
    yiddishCity: "האדובעסערמין",
    name: "Hajdúböszörmény — the Jewish cemetery",
    yiddishName: "האדובעסערמין — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, opposite 51 Külső-Hadházi utca, Hajdúböszörmény, Hajdú-Bihar, Hungary",
    coordinates: "47.67238, 21.53283",
    arrivalNotes: [
      "IT IS OPPOSITE NUMBER 51 KÜLSŐ-HADHÁZI UTCA — on the other side of the road from the houses, not among them. There is a concrete and wrought-iron fence along the street and an entrance building.",
      "THREE OHELS STAND ON THIS GROUND. One of them and the entrance building both need urgent work; the rest of the cemetery is large and well kept.",
      "THE GRAVES ARE NUMBERED, which for four hundred and twenty-four matzevos is the difference between finding a kever and walking rows. The oldest is from 1860 and the newest from 2007 — this ground was still taking burials this century.",
      "The chevra kadisha here was founded in 1846. A Holocaust memorial stands in the cemetery: the kehilla numbered nine hundred and thirty-four in 1941, was put into a ghetto on the twenty-seventh of May 1944, and was deported between the twenty-fifth and twenty-eighth of June — some to Strasshof in Austria, some to Auschwitz.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/hajduboszormeny-jewish-cemetery/",
  },
  {
    slug: "kallosemjen-cemetery",
    city: "Kállósemjén",
    yiddishCity: "קאלאשעמיען",
    name: "Kállósemjén — the Jewish cemetery",
    yiddishName: "קאלאשעמיען — בית החיים",
    country: "Hungary",
    address: "Jewish section of the municipal cemetery, 45-ös utca, Kállósemjén, Szabolcs-Szatmár-Bereg, Hungary",
    coordinates: "47.86512, 21.92739",
    arrivalNotes: [
      "IT IS INSIDE THE TOWN'S CHRISTIAN CEMETERY, as its own section, on 45-ös utca. There is no fence around the Jewish part and none is needed — go to the municipal cemetery and find the section.",
      "Twenty-five matzevos, from 1898 to 1941. The ground is well kept and looks to have been renovated; expect wildflowers rather than undergrowth. There is no ohel here and no structure of any kind.",
      "This is one of two Jewish burial grounds in the village. It was in use from at least 1872.",
      "Kállósemjén is next to Nagykálló and is almost always reached from it — the Kaliver Rebbe's ohel is ten minutes up the road, and that is what brings people to this corner of Szabolcs.",
      "Ninety-four Jews of Kállósemjén were deported on the twenty-second of April 1944, most of them to Auschwitz. Twenty-one survived the war.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/kallosemjen-jewish-cemetery/",
  },
  {
    slug: "tiszabercel-cemetery",
    city: "Tiszabercel",
    yiddishCity: "טיסאבערצעל",
    name: "Tiszabercel — the Jewish cemetery",
    yiddishName: "טיסאבערצעל — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Vásvári Pál utca, at the end of the lane branching north, Tiszabercel, Szabolcs-Szatmár-Bereg, Hungary",
    coordinates: "48.15445, 21.63993",
    arrivalNotes: [
      "TAKE THE LANE THAT BRANCHES NORTH OFF VÁSVÁRI PÁL UTCA and go to the end of it. The cemetery is behind a concrete wall two and a half metres high, so it is not visible from the street.",
      "WATER AND A TOWEL ARE PROVIDED AT THE EXIT. Somebody thought about who comes here, which tells you the ground is genuinely looked after and not merely tidy.",
      "Seventy-eight matzevos, from 1859 to 1943, in good condition and regularly maintained. No ohel and no other structure.",
      "The kehilla was two hundred and fifty-nine strong in 1820 and a hundred and twenty-nine by 1944, Orthodox after the split of 1869. In 1944 every Jew in the village was sent to the ghetto at Nyíregyháza and from there to Auschwitz, the rov among them.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/tiszabercel-jewish-cemetery/",
  },
  {
    slug: "letychiv-cemetery-site",
    city: "Letychiv",
    yiddishCity: "לעטיטשעוו",
    name: "Letychiv — the site of the old Jewish cemetery",
    yiddishName: "לעטיטשעוו — פלאץ פון בית החיים",
    country: "Ukraine",
    address: "Site of the old Jewish cemetery, beside 5/1 Likarska street, Letychiv, Khmelnytskyi Oblast, Ukraine",
    coordinates: "49.38104, 27.62852",
    arrivalNotes: [
      "THERE IS NOTHING TO ENTER AND NOTHING TO ASK FOR. The ground goes back to about 1760. It was demolished in the nineteen-seventies and private houses were built across the whole of it. It is somebody's street now.",
      "ONE FRAGMENT OF ONE MATZEVAH SURVIVES, in a private yard beside 5/1 Likarska street. That is the entire physical remainder of two centuries of burials, and it is on private property — it is not something to go and handle.",
      "The land is privately owned, so nothing can be restored and nothing is planned. ESJF has made a three-dimensional model of the site, which is as close as anybody will get to seeing the ground as a cemetery.",
      "There were Jews in Letychiv from 1581. Pogroms came in 1882 and again in 1919; after the German occupation of 1941 a ghetto was made here, and over seven thousand Jews died in the town during it.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/letychiv-old-jewish-cemetery/",
  },
];
