// Bulk kevarim — batch 29. Four more directory towns, and Žagarė is the best
// set of directions in the whole run: turn right off Raktuvės seven hundred
// metres past the chapel, carry on a hundred metres to a house, and the
// cemetery is in the woodland behind that house's plot. Nobody would find it
// otherwise.
//
// A BUG THIS BATCH TURNED UP AND FIXED. Žagarė's directory slug was written
// with a Lithuanian diacritic — `zagarė` — and its town page had been
// returning 404 at every URL encoding for as long as the entry has existed.
// Nothing was breaking loudly, because a page nobody can open does not
// complain. The slug is ASCII now and the page resolves.
//
// SLABODKA IS NOT THE YESHIVA. People search the name because of the yeshiva
// and its roshei yeshiva, and what is under it is a destroyed cemetery and
// the ground of the Kovno ghetto. The page says which is which.
//
// Letychiv was searched for this batch and produced nothing at all — not a
// street, not a survey. It stays bare rather than being filled with the
// general facts about Podolia that a search returns instead.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries29: Cemetery[] = [
  {
    slug: "zagare-cemeteries",
    city: "Žagarė (Zhager)",
    yiddishCity: "זשאגער",
    name: "Zhager — the Jewish cemeteries",
    yiddishName: "זשאגער — בתי החיים",
    country: "Lithuania",
    address: "New Žagarė Jewish cemetery, off Raktuvės street, Žagarė, Joniškis district, Lithuania",
    coordinates: "56.35324, 23.23129",
    airportRef: "56.353, 23.253",
    arrivalNotes: [
      "TWO TOWNS, TWO KEHILLOS, TWO CEMETERIES. Until the end of the eighteen-hundreds Old Žagarė and New Žagarė were separate places, each with its own kehilla and its own burial ground. They are one town now and the two cemeteries are still two.",
      "HOW TO FIND THE NEW ŽAGARĖ GROUND, because nobody finds it by address: take Raktuvės street from the chapel at number 46 and go south. Seven hundred metres on, turn right. A hundred metres after that there is a house — the cemetery is behind that house's plot, in the woodland. It is eight hundred metres south of the chapel in a straight line.",
      "It is the larger of the two: over eight hundred matzevos in pink, grey and black granite and in concrete, from 1845 to 1929, on two-thirds of a hectare. The middle of the ground is clear and walkable; the edges are lost under bushes, long grass and leaf litter.",
      "The Old Žagarė ground is at the northern end of the town, about a hundred stones, from 1830 to 1934, all inscribed in Hebrew. Between 2018 and 2022 Maceva documented every stone and inscription still there, so what it holds is on record and can be read before travelling.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://www.jewish-heritage-lithuania.org/jewish-heritage-sites-in-joniskis-municipality/naujoji-zagare-jewish-cemetery/",
  },
  {
    slug: "slabodka-cemetery",
    city: "Slabodka (Vilijampolė)",
    yiddishCity: "סלאבאדקע",
    name: "Slabodka — the Jewish cemetery",
    yiddishName: "סלאבאדקע — בית החיים",
    country: "Lithuania",
    address: "Jewish cemetery, Kalnų street, north of the Lopšelio street junction, Vilijampolė, Kaunas, Lithuania",
    airportRef: "54.913, 23.897",
    arrivalNotes: [
      "PEOPLE COME HERE FOR THE YESHIVA AND THIS IS NOT THE YESHIVA. Slabodka is a district of Kovno across the river, and what this listing is about is its burial ground.",
      "It is on Kalnų street, north of where Lopšelio meets it. There is a mesh fence on concrete posts and an information board at the entrance, put up by the city's cemetery service, with the site's rules on it — no cars, no dogs, no fires, no smoking.",
      "THE OBVIOUS FIELD IS NOT WHERE THE STONES ARE. About twenty matzevos stand where you come in. Walk to the far northern end and there are many more, some of them hundreds of years old, on the hill in the trees. Anyone who stops at the near field will conclude the cemetery is empty and be wrong.",
      "The ground was destroyed in 1963 and the clean-up work on it, together with the Seventh Fort, only began in 2016.",
      "SLABODKA WAS THE KOVNO GHETTO. After the German invasion in 1941 this district was where the ghetto was made — nearly thirty thousand Jews in it at its height, and ninety who got out alive when it was destroyed in 1944. You are walking in that as well.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/kaunas-slobodca-jewish-cemetery/",
  },
  {
    slug: "ivano-frankivsk-cemeteries",
    city: "Ivano-Frankivsk (Stanislav)",
    yiddishCity: "סטאניסלאוו",
    name: "Stanislav — the Jewish cemeteries",
    yiddishName: "סטאניסלאוו — בתי החיים",
    country: "Ukraine",
    address: "Newer Jewish cemetery, Ivano-Frankivsk, Ivano-Frankivsk Oblast, Ukraine",
    coordinates: "48.91630, 24.68314",
    airportRef: "48.922, 24.711",
    arrivalNotes: [
      "THE OLD CEMETERY IS UNDER A CINEMA. The kehilla was given the land by charter on the seventeenth of September 1662 — outside the fortifications, on the road to Tyśmienica — and buried its dead there for two and a half centuries. Every stone is gone, nobody knows where they were taken, and a cinema and a public open space stand on it. There is no wall and no gate because there is nothing left to enclose.",
      "GO TO THE NEWER GROUND INSTEAD. It dates from the nineteen-twenties or thirties and still has hundreds of matzevos standing, which is owed to the work of Rabbi Kolesnik in the city.",
      "Ivano-Frankivsk is the city whose rov ruled that the matzevos recovered from around Rohatyn should go back to Rohatyn's old cemetery. If you are working this part of Galicia, the kehilla here is the address that knows the region.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/ukraine/ivano-frankovsk",
  },
  {
    slug: "balta-cemetery",
    city: "Balta",
    yiddishCity: "באלטא",
    name: "Balta — the Jewish cemetery",
    yiddishName: "באלטא — בית החיים",
    country: "Ukraine",
    address: "Jewish cemetery, Balta, Odesa Oblast, Ukraine",
    airportRef: "47.936, 29.620",
    arrivalNotes: [
      "It is reached by turning straight off a public road and there is no wall, no fence and no gate — access is open to anybody, at any hour.",
      "EXPECT TO FIND LITTLE OR NOTHING STANDING. The survey records either no visible stones or stones from the eighteen-hundreds, and does not settle which. Go with the lower expectation.",
      "Balta was a substantial Podolian kehilla — over thirteen thousand Jews in 1900, in a town made in 1797 by joining three smaller ones. What is on the ground today does not reflect that and the page is not going to pretend otherwise.",
      "Balta is in Odesa oblast now rather than in Podolia as the old sources have it, which matters when navigating.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/ukraine/balta",
  },
];
