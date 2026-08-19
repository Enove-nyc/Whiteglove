// Bulk kevarim — batch 25. Four more directory towns.
//
// The one worth the batch on its own is Tokaj, where the old cemetery is on an
// island between the Tisza and the Bodrog and there is no road to it. You go
// by boat or you do not go. Nothing else in these listings has that problem
// and somebody planning a Zemplén trip needs to know it before the morning
// they set out.
//
// A NAME PEOPLE WILL EXPECT AND WILL NOT FIND: Reb Shayale. He is asked about
// all over this region and his ohel is on Dereszla hill at Bodrogkeresztúr, a
// different village a few kilometres from Tokaj — one search result put him in
// Tokaj and it is wrong. The Tokaj page says where he actually is.
//
// Zbarazh's two grounds are counted differently by two good sources — about
// ten stones in one telling, a hundred and seventy-five documented in the
// other — because they are counting different cemeteries. The listing splits
// them rather than picking a number.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries25: Cemetery[] = [
  {
    slug: "tokaj-cemeteries",
    city: "Tokaj",
    yiddishCity: "טוקאי",
    name: "Tokaj — the Jewish cemeteries",
    yiddishName: "טוקאי — בתי החיים",
    country: "Hungary",
    address: "Jewish cemetery, Bodrogkeresztúri út, Tokaj, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.117, 21.410",
    arrivalNotes: [
      "THE OLD CEMETERY IS ON AN ISLAND AND THERE IS NO ROAD. It lies between the Tisza and the Bodrog and is reached by boat, nothing else. Arrange the crossing before the day, and know that it floods — that is the standing threat to the ground, and it has damaged up to half the stones. Its matzevos run from 1799 onwards, a few hundred of them still in place. There is a broken wall and the gate is locked.",
      "The cemetery you can drive to is the newer one, on Bodrogkeresztúri út, opened in 1871. Thousands of graves, a beis tahara, a well, and an ohel on the ground.",
      "BOTH GATES LOCK AND THE SAME MAN HOLDS BOTH KEYS — the surveys give him as Lajos Lővy for the island and Lajos Dudovics for the newer ground, with Dudovics named as keyholder of both. Arrange it in the town before going up.",
      "The newer ground is being eaten by water running off the hill above it, which the survey calls a very serious threat. Expect washed-out ground and leaning stones on the upper rows.",
      "REB SHAYALE IS NOT IN TOKAJ. His ohel is on Dereszla hill at Bodrogkeresztúr, the next village, and that is a separate stop — people arrive here looking for him.",
      "Each cemetery is laid out with separate sections for men, for women and for rabbonim, so head for the rabbonim's rows rather than walking the whole ground.",
    ],
    burials: [
      {
        name: "Rabbi Dovid Schück",
        yiddishName: "רבי דוד שיק",
        knownAs: "Rov of Tokaj",
        yahrzeit: "5659 / 1899",
        note: "The second rov of the kehilla, following Reb Gavriel Yaakov Szenditz. The survey names him among the rabbonim buried in the newer cemetery on Bodrogkeresztúri út.",
      },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/hungary/tokaj",
  },
  {
    slug: "zbarazh-cemeteries",
    city: "Zbarazh",
    yiddishCity: "זבאריז",
    name: "Zbarazh — the Jewish cemeteries",
    yiddishName: "זבאריז — בתי החיים",
    country: "Ukraine",
    address: "New Jewish cemetery, corner of Hrushevskoho and Hoholya, Zbarazh, Ternopil Oblast, Ukraine",
    coordinates: "49.67368, 25.76294",
    airportRef: "49.674, 25.763",
    arrivalNotes: [
      "TWO GROUNDS, AND THE NEWER ONE IS THE ONE TO WALK. It is at the corner of Hrushevskoho and Hoholya, about a hundred and seventy-five matzevos on two-thirds of a hectare, opened in the early nineteen-hundreds. The old ground goes back to 1510 and the Germans destroyed it; roughly ten stones are left of it.",
      "It is fenced. ESJF put a stone and metal perimeter round the newer ground in 2018 and a bilingual sign on it in 2022, and the municipality keeps the vegetation down — so it is walkable rather than a thicket, which in this part of Ukraine cannot be assumed.",
      "EVERY ONE OF THE HUNDRED AND SEVENTY-FIVE STONES HAS BEEN READ AND PUBLISHED — photographed, transcribed in Hebrew and translated, in a monograph, with a digital memory map giving what is known of each person. If you are looking for a particular kever here, it can be found before you travel rather than hunted for on the day.",
      "The oldest matzevos anybody recorded in the town, cut with Polish eagles, were dated 1756 and 1790. Those belonged to the old ground and are not among what stands today.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://jewishheritageguide.net/en/case-studies/cs04",
  },
  {
    slug: "radauti-cemetery",
    city: "Rădăuți",
    yiddishCity: "ראדעװיץ",
    name: "Rădăuți — the Jewish cemetery",
    yiddishName: "ראדעװיץ — בית החיים",
    country: "Romania",
    address: "Jewish cemetery, Rădăuți, Suceava County, Bukovina, Romania",
    airportRef: "47.845, 25.919",
    arrivalNotes: [
      "THERE IS NO SIGN ON IT. The ground is flat and inside the town, turned into directly off a public road, with a masonry wall all round and a gate that locks. Entry is with permission, so it is arranged rather than walked into.",
      "It is large — five hundred metres by three hundred, the same size it was before the war, with over five thousand graves visible. It was opened in the seventeen hundreds and was still taking burials in 1999.",
      "THE OHELS OF THE RĂDĂUȚI RABBONIM ARE BEING REPAIRED as part of the restoration of the ground. What state they are in when you arrive depends on how far that work has got.",
      "THE WHOLE CEMETERY HAS BEEN INDEXED and the index published, so a specific kever can be located in advance. For a ground of five thousand graves that is the difference between a visit and a search.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/radauti-suceava-county-moldavia-region",
  },
  {
    slug: "baranovichi-cemetery",
    city: "Baranovichi",
    yiddishCity: "באראנאוויטש",
    name: "Baranovitch — the Jewish cemetery",
    yiddishName: "באראנאוויטש — בית החיים",
    country: "Belarus",
    address: "Jewish cemetery, Chernyshevskogo street, Baranovichi, Brest Region, Belarus",
    airportRef: "53.133, 26.033",
    arrivalNotes: [
      "It is fenced and it is kept, which in Belarus is worth saying first. The upkeep is the work of the Baranowitzer society in Israel and of one man in the town, Shmuel Kaplan, who acts as caretaker. The ground is on Chernyshevskogo street and is a normal stop on a city tour.",
      "FEW OF THE ORIGINAL MATZEVOS ARE LEFT. The stones of the town's known families — Kuncevitsky, Turevsky, Vinograd, Slucjac — went into the foundations of the buildings around. One stone is still there lying on its side over the Halperin family's crypt.",
      "THIS GROUND IS ITSELF A PLACE OF KEDOSHIM. The Einsatzkommando murdered here. A memorial marks where about nineteen thousand Jews were killed around the end of July 1942, and a second marks three thousand Czech prisoners taken off a train and shot. Behave in it accordingly.",
      "The marker put up after independence was raised with the help of a survivor, Moshe Zalmanovich; when it was desecrated he paid to have it restored himself.",
      "Baranovitch is a name people know from the yeshiva of Reb Elchonon Wasserman and from the Slonimer and Koidanover rebbes who lived here between the wars. No source found says any of them lies in this ground, and this listing is not going to place them in it.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/belarus/baranavichy-brest-oblast-baranovichi-baranowicze-baranovich-baranovitch-baranovitsh-baranovits-baranovitsh-baranoviche-baranaviy",
  },
];
