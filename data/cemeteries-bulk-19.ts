// Bulk kevarim — batch 19. The last four directory towns expected to hold real
// material, researched.
//
// The Ruzhiner is NOT in this file, and the reason is worth recording. He is
// buried in Sadhora, which is now a district of Chernivtsi, and I wrote a
// Chernivtsi listing for him — which duplicated `sadhora-ruzhiner`, a listing
// that has been in cemeteries-bulk-3.ts all along and which my own check had
// already reported as present. The duplicate is gone; what was actually
// missing was the PAIRING, so the Chernivtsi page could find it. That is in
// data/destination-database.ts with the others.
//
// Two of these three name nobody. Brest and Iași lost their old grounds
// completely, and what those pages have to say is what happened and what
// stands there now — which for Brest is a sports stadium.
//
// Same rules throughout: named sources, no invented GPS, and where a source is
// uncertain the page says so.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries19: Cemetery[] = [
  {
    slug: "miskolc-avas",
    city: "Miskolc",
    yiddishCity: "מישקאלץ",
    name: "Miskolc — the Jewish cemetery on Avas Hill",
    yiddishName: "מישקאלץ — בית החיים אויף אַװאַש",
    country: "Hungary",
    address: "Jewish cemetery, Avas Hill, Miskolc, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.104, 20.791",
    arrivalNotes: [
      "The cemetery is on Avas Hill above the city, and it is very large — something like sixteen thousand matzevos from the seventeen and eighteen hundreds. Know which ohel you are looking for before you arrive.",
      "There are three ohels here, not one, and the rabbonim are divided between them.",
      "Miskolc is one of the eastern Hungarian towns whose sites have had work done specifically to make visits by chassidishe travellers easier, so access is better than the size of the ground might suggest.",
    ],
    burials: [
      // The sources name these three as the rabbonim in the ohels but do not
      // say which man is in which, so neither does this.
      {
        name: "Rabbi Meyer Rosenfeld",
        yiddishName: "רבי מאיר ראזענפעלד",
        note: "One of the rabbonim in the three ohels on Avas Hill.",
      },
      {
        name: "Rabbi Chaim Mordechai Yaakov Gottlieb",
        yiddishName: "רבי חיים מרדכי יעקב גאטליב",
        note: "One of the rabbonim in the three ohels on Avas Hill.",
      },
      {
        name: "Rabbi Asher Anshel Wiener",
        yiddishName: "רבי אשר אנשיל וויענער",
        note: "One of the rabbonim in the three ohels on Avas Hill.",
      },
      {
        name: "Rabbi Shmuel Austerlitz",
        yiddishName: "רבי שמואל אויסטערליץ",
        knownAs: "Chief rabbi of Miskolc from 1878",
        note: "Rov of the kehilla from 1878 until his petirah. The Holocaust memorial standing in this cemetery was put up at his arranging.",
      },
    ],
    sourceUrl: "https://zsidooroksegutja.hu/en/place/miskolc-2/",
  },
  {
    slug: "brest-brisk-cemetery",
    city: "Brest (Brisk)",
    yiddishCity: "בריסק",
    name: "Brisk — the destroyed Jewish cemetery",
    yiddishName: "בריסק — בית החיים החרב",
    country: "Belarus",
    address: "Site of the old Jewish cemetery, Brest, Brest Region, Belarus",
    airportRef: "52.098, 23.734",
    arrivalNotes: [
      "THERE IS NO CEMETERY TO VISIT. This was one of the oldest and largest Jewish burial grounds in Belarus. The Germans demolished it in 1941–42, and in 1959 the Soviet authorities cleared the site and built the Lokomotiv stadium and its playing fields on top of it. The sports ground is still there and still in use.",
      "The matzevos went into the city itself. Jewish gravestones have been found in Brest's road surfaces, its pavements, its gardens and the foundations of its houses — fifteen hundred recovered by 2014, four hundred and fifty of them dug up during the building of a supermarket.",
      "A memorial is being made from the rescued stones: a broken circle of wall and walkway around some six hundred re-erected matzevos, on land that was part of the cemetery. Ask what stands before you travel — this is a site whose state changes.",
      "One name people search for here: the Beis HaLevi, Reb Yosef Dov Soloveitchik, was niftar in Brisk in 1892. Sources disagree about where he was buried — some say here, some say the Warsaw cemetery on Okopowa — and this site is not going to choose for you. If Brisk, there is nothing left to stand at.",
    ],
    burials: [],
    sourceUrl: "https://www.thetogetherplan.com/jewish-graves-in-brest/",
  },
  {
    slug: "iasi-cemetery",
    city: "Iași",
    yiddishCity: "יאס",
    name: "Iași — the Jewish cemetery",
    yiddishName: "יאס — בית החיים",
    country: "Romania",
    address: "Jewish cemetery, Iași, Iași County, Moldavia, Romania",
    airportRef: "47.157, 27.587",
    arrivalNotes: [
      "The ground in use is about a century old. The earlier cemetery was destroyed, and a few of its stones were carried across to the newer one — the oldest Hebrew matzevah known in Romania, dated 1476, comes from Iași.",
      "An ohel here was rebuilt by visitors from Israel and holds the stones of two rabbonim.",
      "The cemetery carries a Holocaust memorial, memorials to the victims of the pogrom and to Jewish soldiers, and marked mass graves. It is regularly visited.",
      "There is a Jewish hospitality house in Iași for travellers visiting the kevarim of the region, open over the summer. Ask there before setting out to other towns in Moldavia.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/romania/iasi-judet-iasi-moldavia-region",
  },
];
