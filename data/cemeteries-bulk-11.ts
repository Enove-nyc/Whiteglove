// Bulk kevarim — batch 11. Meknes, and Kelm.
//
// Two entries, and two completely different kinds of not knowing. They are in
// the same file because the contrast is the point, and because a reader should
// be able to see how this site handles each.
//
// MEKNES is documented. Rabbi Raphael Berdugo is buried in the old Jewish
// cemetery there, his kever is a pilgrimage site, and the two-hundredth
// yahrzeit was marked at the grave in 2021 with people who had flown in for it.
// Everything below about Meknes is sourced and can be relied on to the extent
// anything printed can be.
//
// KELM is not. The Alter of Kelm was born there, ran the Talmud Torah there and
// was niftar there on Erev Tisha B'Av 1898 — all of that is documented. Where
// he is buried is not. The town's bais hachaim survives and has been surveyed,
// and he is named among the town's famous Jews in that survey, but no source we
// found places his kever inside it or identifies the stone.
//
// The obvious inference is that a man who died in Kelm in 1898 lies in Kelm's
// bais hachaim, and it is probably right. It is still an inference, and this
// site has already been caught out by obvious inferences — the Steipler is not
// in Zichron Meir, Rav Ovadia is not on Har HaMenuchos, the Nitra Rov is not in
// Nitra. So Kelm is listed with the gap named rather than filled, and anybody
// going should ask locally before they daven by a stone.
//
// IMPORTANT (safety): no grave GPS is invented here, and this batch carries no
// coordinates at all. Navigate by the address and confirm on the ground.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries11: Cemetery[] = [
  {
    slug: "meknes-old-bais-hachaim",
    city: "Meknes (Meknès)",
    yiddishCity: "מקנס",
    name: "Meknes — the old bais hachaim, kever of Rabbi Raphael Berdugo",
    yiddishName: "מקנס — בית החיים הישן",
    country: "Morocco",
    address:
      "Old Jewish cemetery, in the mellah of Meknes, Fès-Meknès region, Morocco — no street address is published here; ask at the mellah",
    arrivalNotes: [
      "The cemetery was restored on the order of King Mohammed VI, whose 2010 programme covered more than 170 Jewish cemeteries across Morocco. It is in better condition than most and was formally rededicated with Moroccan Jews from around the world in attendance.",
      "Rabbi Raphael Berdugo's kever is the reason most people come, and it is a working pilgrimage site rather than a ruin.",
      "Meknes and Fez are an hour apart, and the Fez mellah bais hachaim is already listed on this site — most people do both in one trip.",
      "We are printing no gate contact and no opening time, because we could not stand behind either. Ask the Council of Jewish Communities of Morocco, or the community in Fez, before setting out.",
    ],
    accessNote:
      "Restored and maintained cemetery, but access is through a caretaker rather than an open gate. Arrange it in advance rather than arriving and hoping.",
    burials: [
      {
        name: "Rabbi Raphael Berdugo",
        yiddishName: "רבי רפאל בירדוגו",
        knownAs: "HaMalach — the Angel",
        yahrzeit: "1821",
        note: "Born in Meknes in 1747 into the Berdugo rabbinic family and dayan of the city, he was the figure Maghrebi Jewry turned to through the riots of 1790 to 1792. Known as HaMalach, the Angel. He was niftar in 1821, and the two-hundredth anniversary of his petirah was marked at this cemetery in 2021.",
      },
    ],
    sourceUrl: "https://en.yabiladi.com/articles/details/81119/jewish-pilgrimage-morocco-rabbi-raphael.html",
  },
  {
    slug: "kelme-kelm-bais-hachaim",
    city: "Kelmė (Kelm)",
    yiddishCity: "קעלם",
    name: "Kelm — the bais hachaim",
    yiddishName: "קעלם — בית החיים",
    country: "Lithuania",
    address: "Jewish cemetery, Kelmė, Šiauliai County, Lithuania — no street address is published here; ask in the town",
    arrivalNotes: [
      "READ THIS BEFORE YOU GO. Kelm's bais hachaim survives and has been surveyed, and the Alter of Kelm is named among the town's famous Jews in that survey. But no source we found places his kever inside it, and none identifies which stone is his. We are not going to tell you it is here when nobody has told us that.",
      "What is documented is that he was born in Kelm in 1824, founded and ran the Talmud Torah here, and was niftar here on Erev Tisha B'Av 1898 — in the middle of saying Ezras avoseinu, having just finished Shema.",
      "So: come for the town and for the bais hachaim, ask locally about the kever, and do not assume a stone. If somebody there can show you, that is worth more than anything printed in advance.",
      "Kelmė is about 60 km south-west of Šiauliai and roughly three hours from Vilnius. There is no organised reception and nothing kosher; carry the day's food.",
    ],
    accessNote:
      "Open rural site with no facilities and no caretaker we can vouch for. The Jewish community of Lithuania in Vilnius is the right place to ask before travelling out.",
    burials: [
      {
        name: "Rabbi Simcha Zissel Ziv Broida",
        yiddishName: "רבי שמחה זיסל זיו ברוידא",
        knownAs: "The Alter of Kelm — his kever here is NOT confirmed",
        yahrzeit: "ערב תשעה באב · 26 July 1898",
        note: "One of the foremost talmidim of Rav Yisroel Salanter and among the first leaders of the mussar movement; founder and rosh of the Kelm Talmud Torah, whose derech shaped much of the yeshiva world after him. He was born in Kelm, taught in Kelm and was niftar in Kelm on Erev Tisha B'Av 1898. His burial place is NOT established by any source we found: the town's bais hachaim survives and he is named among Kelm's famous Jews in the survey of it, but nothing places his kever within it or identifies the stone. Ask locally, and do not daven by a stone on the strength of this listing.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Simcha_Zissel_Ziv",
  },
];
