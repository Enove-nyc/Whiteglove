// Bulk kevarim — batch 21. Three more directory towns.
//
// Same rules. One thing worth naming here, because it is the second time a
// source has said something plainly impossible: a page describing Reb Shaul
// Brach of Kashau calls him a talmid of the Chasam Sofer. The Chasam Sofer was
// niftar in 1839 and Reb Shaul was born in 1865. That claim is not in this
// file — the same way "the Levush" is not in the Mád listing in batch 16.
// Check a date before repeating a lineage.
//
// Minsk was researched for this batch and left out: its old cemetery was
// destroyed and built over in the nineteen-sixties, which is a real page, but
// the sources found disagree on which ground and nothing firm enough to send
// somebody to came out of it.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries21: Cemetery[] = [
  {
    slug: "kosice-orthodox-cemetery",
    city: "Košice (Kashau)",
    yiddishCity: "קאשי",
    name: "Kashau — the Orthodox Jewish cemetery",
    yiddishName: "קאשוי — בית החיים החרדי",
    country: "Slovakia",
    address: "Orthodox Jewish cemetery, Košice, Košice Region, Slovakia",
    coordinates: "48.692791, 21.255768",
    airportRef: "48.716, 21.261",
    arrivalNotes: [
      "There is more than one Jewish cemetery in the city — the Orthodox ground and the Neolog one lie beside each other and beside the municipal cemetery. Ask for the Orthodox one by name.",
      "SOURCES DISAGREE ABOUT WHICH STREET to navigate by: one survey says Rastislavova, another names Žižkova. One of them also places the cemeteries above the Danube, which is Bratislava and not Košice at all, so treat street names from these surveys with care and confirm on the ground.",
      "A searchable database of the burials in the city's Jewish cemeteries exists, so a specific kever can be located before travelling rather than hunted for on the day.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [
      {
        name: "Rabbi Shaul Brach",
        yiddishName: "רבי שאול בראך",
        knownAs: "The Kashauer Rov",
        yahrzeit: "5700 / 1940",
        note: "1865–1940. Born in Nitra, rov in Nagykároly and Veľký Meder before Košice, where he led the kehilla and its yeshiva gedola until his petirah in February 1940. His matzevah records that he ran the yeshiva from 1892 to the end of his life, and a great many Hungarian rabbonim were his talmidim.",
      },
    ],
    sourceUrl: "https://kehilalinks.jewishgen.org/kosice/Kosice-Religious.html",
  },
  {
    slug: "debrecen-cemetery",
    city: "Debrecen",
    yiddishCity: "דעברעצין",
    name: "Debrecen — the Jewish cemetery",
    yiddishName: "דעברעצין — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Monostorpályi út 10, Debrecen, Hajdú-Bihar, Hungary",
    coordinates: "47.513037, 21.639582",
    airportRef: "47.532, 21.639",
    arrivalNotes: [
      "STILL AN ACTIVE CEMETERY, which is rare in this part of the world and changes how you behave in it. Several thousand matzevos, renovated, with clean paths that can be walked.",
      "A caretaker lives beside the ground, so it is not a locked field — but arrangements go through the kehilla in the town, at Bajcsy-Zsilinszky utca 26.",
      "Debrecen is the nearest city to several of the kever towns of eastern Hungary and has the kosher food and the mikvah those towns do not, so it is where people base themselves rather than a stop of its own.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://www.debrecen.hu/en/tourist/articles/jewish-heritage",
  },
  {
    slug: "panevezys-cemetery-site",
    city: "Panevėžys (Ponevezh)",
    yiddishCity: "פאנעוועזש",
    name: "Ponevezh — the site of the Jewish cemetery",
    yiddishName: "פאנעוועזש — פלאץ פון בית החיים",
    country: "Lithuania",
    address: "Site of the Jewish cemetery, Panevėžys, Panevėžys County, Lithuania",
    coordinates: "55.73078, 24.3523",
    airportRef: "55.730, 24.360",
    arrivalNotes: [
      "IT IS A PARK NOW. The cemetery was destroyed in 1966 and its matzevos taken away as building material. The ground was laid out as a city park, with paths and benches, and not one stone stands where it stood.",
      "The community worked for years to have the taken stones brought back. A memorial marks the ground, and the Sad Jewish Mother monument stands where the cemetery was.",
      "Ponevezh is a name people know from the yeshiva rather than from the town, and the yeshiva that carries it is in Bnei Brak. Reb Itzele Ponevezher led the kehilla and the yeshiva here until 1919; no matzevah survives to say who else lay in this ground.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/panevezys-jewish-cemetery/",
  },
];
