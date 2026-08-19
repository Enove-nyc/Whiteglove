// Bulk kevarim — batch 33. ONE town, and a source this site had not been using.
//
// Carei was one of the four towns settled as genuine negatives two batches
// ago, on the strength of ESJF's full index of 4,166 surveys not containing
// it. That reasoning was sound and the conclusion was still too narrow: ESJF
// does not survey Romania, so its silence about Carei said nothing about
// Carei. The Center for Jewish Art has the town's old cemetery documented,
// photographed on the ground in 1997, with coordinates.
//
// That opens a second source for exactly the countries ESJF leaves out —
// Romania, the Czech lands, Belarus — where a good many listings on this site
// still have no map point. Its records carry a coordinate field, and where the
// coordinate is unknown it publishes 0.000000, 0.000000, which the existing
// Null Island test already refuses.
//
// WHAT THIS PAGE DOES NOT HAVE is any of the usual practical detail: no gate,
// no keyholder, no condition, no count of stones. The CJA record is a
// photographic survey and its descriptive fields are almost all Unknown. So
// the page says the street, the coordinate and who stood there with a camera,
// and stops. That is thinner than any other listing here and it is still more
// than the town had.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries33: Cemetery[] = [
  {
    slug: "carei-old-cemetery",
    city: "Carei (Nagykároly)",
    yiddishCity: "קאריי",
    name: "Nagykároly — the old Jewish cemetery",
    yiddishName: "קאריי — בית החיים הישן",
    country: "Romania",
    address: "Old Jewish cemetery, Strada Șoimului, Carei, Satu Mare County, Transylvania, Romania",
    coordinates: "47.682354, 22.454317",
    airportRef: "47.686, 22.468",
    arrivalNotes: [
      "IT IS ON ȘOIMULUI, at the western edge of the town, about a kilometre from the centre. This listing carries a surveyed coordinate; navigate to that rather than to the street name.",
      "THIS PAGE IS DELIBERATELY SHORT. The record behind it is a photographic survey — seventy-five photographs taken on the ground by Boris Khaimovich in 1997 for the Center for Jewish Art — and its written fields are almost entirely blank. Nobody has published the condition of this ground, whether it is fenced, whether it locks or who holds a key. Treat all of that as unknown and ask in the town.",
      "There have been Jews in Nagykároly since 1720, when the local lord brought in twelve families and a kehilla was organised in the same year. This is their burial ground.",
      "REB SHAUL BRACH WAS ROV HERE BEFORE KASHAU, and he is not buried here — his kever is in the Orthodox cemetery at Košice, about two hundred kilometres north. People searching his name reach Nagykároly first.",
    ],
    burials: [],
    sourceUrl: "https://cja.huji.ac.il/browser.php?mode=set&id=10010",
  },
];
