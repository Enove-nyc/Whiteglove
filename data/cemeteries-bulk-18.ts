// Bulk kevarim — batch 18. Three more directory towns.
//
// A THINNER BATCH THAN 16 AND 17, and honestly so. The towns with a famous
// kever and a well-kept ohel have been done. What is left is mostly grounds
// like these: real, large, worth visiting, and without a single name that
// sources agree on. Two of the three below therefore carry no `burials` at
// all.
//
// That is not a failure of the listing — it is the listing being accurate. A
// page that says "this cemetery is on Dzherelna, seven thousand stones stand
// on the hillside, and nothing is maintained" is useful. A page that guesses
// at whose ohel it is would be worse than the empty page it replaced. Dukla's
// ohel in particular is recorded as "probably" one family's, and probably is
// not something to print under somebody's name.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries18: Cemetery[] = [
  {
    slug: "kremenets-old-cemetery",
    city: "Kremenets",
    yiddishCity: "קרעמעניץ",
    name: "Kremenets — the old Jewish cemetery",
    yiddishName: "קרעמעניץ — בית החיים הישן",
    country: "Ukraine",
    address: "Jewish cemetery, Dzherelna, Kremenets, Ternopil Oblast, Ukraine",
    coordinates: "50.10568, 25.73380",
    airportRef: "50.107, 25.727",
    arrivalNotes: [
      "The cemetery lies on the slope of Mount Chercha, off Dzherelna. It has been fenced and partly restored, which is why so much of it survives.",
      "About seven thousand matzevos stand here, some fifty of them from the sixteenth century — this is one of the older and larger surviving grounds in the region, not a small plot to walk in an hour.",
      "NOBODY MAINTAINS IT. Vegetation is the real obstacle: in the growing season the overgrowth blocks access and covers stones, so late autumn to early spring is when the ground can actually be walked. There is an ohel within the cemetery.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://shtetlroutes.eu/en/kremenets-putvnik/",
  },
  {
    slug: "prostejov-cemeteries",
    city: "Prostějov",
    yiddishCity: "פראסטיץ",
    name: "Prostějov (Prossnitz) — the Jewish cemeteries",
    yiddishName: "פראסטיץ — בתי החיים",
    country: "Czech Republic",
    address: "New Jewish cemetery, Chorázova, 796 01 Prostějov, Olomouc Region, Czech Republic",
    airportRef: "49.472, 17.112",
    arrivalNotes: [
      "There are two grounds and only one to navigate to. The newer cemetery, from 1908, is on Chorázova, about a kilometre south-east of the centre, and it is the one that stands.",
      "The old cemetery of 1801 lay where Lidická, Studentská and Tylova now meet. It was destroyed under the occupation and its matzevos taken for building material; around a hundred and fifty stones and fragments have since been recovered by a team working to bring the ground back. There is no cemetery to walk there.",
      "A caretaker holds the key to the newer cemetery, so it is not simply open — arrange entry in advance through the town or the Brno Jewish community rather than turning up.",
    ],
    burials: [
      {
        name: "Rabbi Tzvi Horowitz",
        yiddishName: "רבי צבי הורוויץ",
        knownAs: "Av beis din of Prossnitz",
        yahrzeit: "5576 / 1816",
        note: "Rov of Prostějov, then a substantial Moravian kehilla known in the seforim as Prossnitz. His kever is the one visitors have historically come for.",
      },
    ],
    sourceUrl: "https://prostejov.zidovskyhrbitov.cz/en/history/",
  },
  {
    slug: "dukla-cemetery",
    city: "Dukla",
    yiddishCity: "דוקלא",
    name: "Dukla — the Jewish cemetery",
    yiddishName: "דוקלא — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, Tadeusza Kościuszki, 38-450 Dukla, Subcarpathian Voivodeship, Poland",
    coordinates: "49.54813, 21.68392",
    airportRef: "49.557, 21.685",
    arrivalNotes: [
      "The cemetery is in the southern part of the town, along Tadeusza Kościuszki. It is in two parts — the older from the seventeen hundreds, the newer from after 1870 — and has been a listed monument since 1989.",
      "It was devastated by the Germans during the war, so expect a damaged ground rather than a kept one.",
      "There are ruins of an ohel beside the cemetery. Sources say it PROBABLY belonged to a tzaddik of the Horowitz family and are explicit that this is not certain, and local testimony rejects the other suggestion that it was a mortuary chapel. Nobody should be told whose it is until somebody knows.",
      "SURVEYED COORDINATES, AND THE TOWN'S TWO GROUNDS ARE ALL BUT THE SAME PLACE. ESJF surveyed an old and a new Jewish cemetery here and measured them 59 metres apart, so the map point on this listing serves for both. Old: 49.54813, 21.68392. New: 49.54804, 21.68312.",
    ],
    burials: [],
    sourceUrl: "https://en.wikipedia.org/wiki/Jewish_cemetery_in_Dukla",
  },
];
