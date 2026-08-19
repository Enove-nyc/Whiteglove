// Bulk kevarim — batch 22. Three more directory towns, and NOT ONE NAMED KEVER
// between them.
//
// That is the finding, not a shortfall in the searching. The towns whose
// grounds hold a name people travel for have been done; what remains are
// cemeteries that are real, findable and worth a page, but whose matzevos
// nobody has read and published. Every batch after this should be expected to
// look like this one.
//
// What these pages are good for instead is the practical half: which street,
// which of the town's two grounds, whose door to knock on. That is a genuine
// service — Trnava below is the clearest case, where getting in means knocking
// at a house and waiting for the dogs to be shut away — but it will not bring
// anybody to the site who was not already going.
//
// Left out of Nyíregyháza deliberately: the cemetery carries a 2019 plate
// about corpses being made into soap. That claim is disputed by historians, it
// is not travel information, and this site does not repeat contested history
// to fill a page.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries22: Cemetery[] = [
  {
    slug: "nyiregyhaza-cemetery",
    city: "Nyíregyháza",
    yiddishCity: "נירעדהאז",
    name: "Nyíregyháza — the Jewish cemetery",
    yiddishName: "נירעדהאז — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Kótaji utca, between Gém utca and Stadion utca, Nyíregyháza, Szabolcs-Szatmár-Bereg, Hungary",
    coordinates: "47.97059, 21.70901",
    airportRef: "47.956, 21.717",
    arrivalNotes: [
      "The ground is on Kótaji utca, in the stretch between Gém utca and Stadion utca — that is the way to find it, since the street is long.",
      "TWO OHELS STAND HERE, with a beis tahara and the caretaker's house, which was built in 1865. A Holocaust memorial is on the ground as well.",
      "Nyíregyháza is one of five towns in eastern Hungary whose sites have had work done specifically to make visits by chassidishe travellers easier, so it is in better order than most.",
      "SURVEYED COORDINATES. The map point on this listing is the cemetery itself, measured on the ground by the ESJF survey — not a town centre. Where a kever is inside an ohel it will still need finding once you are through the gate, but the gate is now something you can navigate to.",
    ],
    burials: [],
    sourceUrl: "https://cja.huji.ac.il/browser.php?mode=set&id=41902",
  },
  {
    slug: "trnava-cemetery",
    city: "Trnava (Tirnau)",
    yiddishCity: "טירנאו",
    name: "Trnava — the Jewish cemetery",
    yiddishName: "טירנאו — בית החיים",
    country: "Slovakia",
    address: "Jewish cemetery, Nitrianska 15, Trnava, Trnava Region, Slovakia",
    airportRef: "48.377, 17.588",
    arrivalNotes: [
      "YOU GET IN BY KNOCKING ON SOMEBODY'S DOOR. The old funeral house beside the cemetery — the one with the mogen dovid still on the wall — is a private home now, and its residents hold the way in. Knock and ask.",
      "They keep three large dogs, and they shut them indoors so visitors can walk the ground. Do not let yourself in without asking.",
      "The cemetery is at Nitrianska 15, immediately beside the Christian cemetery, which is the easier landmark to navigate to.",
    ],
    burials: [],
    sourceUrl: "https://billiongraves.com/cemetery/Trnava-%C5%BEidovsk%C3%BD-cintor%C3%ADn/280590",
  },
  {
    slug: "sharhorod-cemeteries",
    city: "Sharhorod",
    yiddishCity: "שארהאראד",
    name: "Sharhorod — the Jewish cemeteries",
    yiddishName: "שארהאראד — בתי החיים",
    country: "Ukraine",
    address: "Jewish cemetery, Sharhorod, Vinnytsia Oblast, Ukraine",
    airportRef: "48.750, 28.083",
    arrivalNotes: [
      "TWO GROUNDS, AND THE ONE IN THE CENTRE IS NOT THE ONE TO WALK. The oldest cemetery sits in the middle of the town today and only about twenty matzevos are still visible in it, dating from the seventeen and early eighteen hundreds. The newer ground is on the hill above the town and is the one that survives as a cemetery.",
      "Sources put the oldest ground's founding anywhere from the mid-fifteen hundreds to the first half of the sixteen hundreds; the stones that can still be read are much later than either.",
      "The reason most people come to Sharhorod is standing: the Great Synagogue of 1589, one of the oldest in Ukraine, built as a fortress with walls one to two metres thick. The Turks held the town from 1674 to 1699 and used it as a mosque. It was restored in 2012.",
    ],
    burials: [],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/sharhorod-old-jewish-cemetery/",
  },
];
