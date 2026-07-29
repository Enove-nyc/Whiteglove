// Bulk kevarim — batch 8. Lithuania, Belarus and Slovakia, where the site was
// thinnest: one Lithuanian bais hachaim before this, and nothing at all in the
// Litvishe yeshiva towns.
//
// IMPORTANT (safety): who is buried where and in which town comes from public
// sources (each entry carries a source). We do NOT invent a precise grave GPS.
// `airportRef` is a CITY-level point used only to rank the nearest airports — it
// is NOT a grave location and must never be used to navigate. Grave navigation
// uses the address; confirm the exact grave/ohel locally.
//
// Two things this batch is deliberately quiet about. Where a source named a
// caretaker, the name is not repeated here — a person's name and number goes on
// the site only once the owner has confirmed it still reaches somebody. And a
// yahrzeit is written only where a source gave the Hebrew date; a civil date
// converted by hand is a guess, and a guess about a yahrzeit is worse than
// leaving it out.
//
// These are also, mostly, cemeteries that were destroyed and partly recovered.
// The arrival notes say so plainly. Somebody flying to Telz to find a family
// matzeivah deserves to know before they book that nine tenths of the ground
// was cleared in 1987.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries8: Cemetery[] = [
  {
    slug: "kaunas-zaliakalnis-yitzchok-elchonon",
    city: "Kaunas (Kovno)",
    yiddishCity: "קאָװנע",
    name: "Kovno — Žaliakalnis bais hachaim, kever of Reb Yitzchok Elchonon",
    yiddishName: "קאָװנע — אוהל ר׳ יצחק אלחנן",
    country: "Lithuania",
    address:
      "Old Jewish cemetery, Žaliakalnis, beside the Ąžuolynas park (Radvilėnai plentas side), Kaunas, Lithuania — no house number is published here; confirm the entrance on the ground",
    airportRef: "54.898, 23.930",
    arrivalNotes: [
      "Kovno had several batei hachaim and they are not interchangeable. Reb Yitzchok Elchonon is in the old cemetery in Žaliakalnis, by the Ąžuolynas park — not in Aleksotas, which is the one cemetery in the city still used for burials and the one most directions online point at. Going to the wrong one is the commonest mistake here.",
      "The Žaliakalnis ground is neglected and overgrown, and has been for years. The city signed an agreement with Maceva, the group that documents Lithuania's Jewish cemeteries, to look after and restore it, and students have worked on clearing it — but do not expect a tended cemetery with signed paths.",
      "There is a mass grave of kedoshim here with its own memorial. Take care where you walk.",
      "We are not publishing an opening time or a gate contact, because we could not stand behind either. Ask the Lithuanian Jewish Community in Vilnius or a local guide before you set out, especially if you want somebody to help you find the kever among the fallen stones.",
    ],
    burials: [
      {
        name: "Rabbi Yitzchok Elchonon Spektor of Kovno",
        yiddishName: "רבי יצחק אלחנן ספּעקטאָר מקאָװנע",
        knownAs: "Reb Yitzchok Elchonon — the poseik the Jewish world wrote to",
        seforim: "באר יצחק · עין יצחק · נחל יצחק",
        note: "Rov of Kovno from 1864 until his petirah on 6 March 1896, and in his lifetime the address for the hardest shailos in Europe and beyond — agunos above all. Yeshiva University's Rabbi Isaac Elchanan Theological Seminary carries his name.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jewish_cemeteries_of_Kaunas",
  },
  {
    slug: "telsiai-telz-bais-hachaim",
    city: "Telšiai (Telz)",
    yiddishCity: "טעלז",
    name: "Telz — what is left of the bais hachaim",
    yiddishName: "טעלז — בית החיים",
    country: "Lithuania",
    address:
      "Jewish cemetery, Telšiai, Telšiai County, Lithuania — no street address is published here; confirm the entrance locally",
    airportRef: "55.983, 22.250",
    arrivalNotes: [
      "Read this before you book. The bais hachaim covered about 2.17 hectares; most of it was destroyed in 1987. Roughly 0.43 hectares survives — under a fifth of the original ground — and that fragment was fenced and put on the Lithuanian Cultural Heritage List in 1995.",
      "Reb Yosef Yehuda Leib Bloch's kever is among the stones that survive, and can still be found. Many others cannot: if you are coming for a particular family matzeivah, the odds are against it still standing, and it is worth asking Maceva or the Lithuanian Jewish Community what is documented before you travel.",
      "The town is a long way from anywhere — roughly two hours by road from Klaipėda and the best part of four from Vilnius. Plan the day around the drive, not around the visit.",
    ],
    burials: [
      {
        name: "Rabbi Yosef Yehuda Leib Bloch of Telz",
        yiddishName: "רבי יוסף יהודה לייב בלאָך מטעלז",
        knownAs: "The Telzer rosh yeshiva who built the derech",
        seforim: "שיעורי דעת",
        note: "Took the Telzer yeshiva after Reb Eliezer Gordon and led it until his petirah on 10 November 1929, building the mussar-and-lomdus derech the yeshiva carried to Cleveland after the churban.",
      },
    ],
    sourceUrl: "https://www.esjf-cemeteries.org/survey/telsiai-jewish-cemetery/",
  },
  {
    slug: "valozhyn-volozhin-reb-chaim",
    city: "Valozhyn (Volozhin)",
    yiddishCity: "װאָלאָזשין",
    name: "Volozhin — the bais hachaim above the yeshiva",
    yiddishName: "װאָלאָזשין — בית החיים",
    country: "Belarus",
    address:
      "Jewish cemetery, on the hill at the corner of Kirova and Kupala streets, Valozhyn, Minsk Region, Belarus — confirm the gate locally",
    airportRef: "54.089, 26.526",
    arrivalNotes: [
      "The cemetery is on a hill north of the yeshiva building, where Kirova street meets Kupala. It is fenced, with several hundred matzeivos still standing — cleared and restored in the 1990s with money raised abroad.",
      "Be careful what you are told about Reb Chaim's kever. The ground was wrecked, and the memorial to him was put up in 1991 overlooking the cemetery. Whether it stands on the exact place he lies is not something we can stand behind — daven there, but do not repeat to others that the spot is certain.",
      "There are kevorim of kedoshim here too, with a plaque for the Jews of Valozhyn who were murdered.",
      "The yeshiva building itself still stands in the town, below the cemetery. Most people come for both; leave time for it.",
    ],
    burials: [
      {
        name: "Rabbi Chaim of Volozhin",
        yiddishName: "רבי חיים מװאָלאָזשין",
        knownAs: "Reb Chaim Volozhiner — talmid of the Vilna Gaon",
        seforim: "נפש החיים",
        note: "Founded the Volozhiner yeshiva in about 1803, the mother of the Litvishe yeshivos. Nefesh HaChaim is his.",
      },
    ],
    sourceUrl: "https://shtetlroutes.eu/en/volozhyn-guidebook/",
  },
  {
    slug: "dunajska-streda-yehuda-assad",
    city: "Dunajská Streda (Serdahely)",
    yiddishCity: "סערדאַהעלי",
    name: "Serdahely — old bais hachaim, kever of Reb Yehuda Assad",
    yiddishName: "סערדאַהעלי — בית החיים הישן",
    country: "Slovakia",
    address:
      "Old Jewish cemetery, Dunajská Streda, Trnava Region, Slovakia — no street address is published here; confirm the gate locally",
    airportRef: "47.993, 17.612",
    arrivalNotes: [
      "The cemetery is walled with a locking gate reached straight off a public road, and there is a caretaker. That means access depends on somebody being there to open it — arrange the visit in advance rather than turning up. We are not printing a name or a number, because we have not confirmed one that still reaches anybody; ask the Bratislava kehilla or the Slovak Jewish Heritage people.",
      "It is a large old ground — the earliest matzeivos read 1755, and hundreds survive in place. Give yourself more than a few minutes if you are looking for a particular stone.",
      "Bratislava is about an hour west by road, so this is comfortably done together with the Chasam Sofer's kever there.",
    ],
    burials: [
      {
        name: "Rabbi Yehuda Assad",
        yiddishName: "רבי יהודה אסאד",
        knownAs: "The Yehuda Ya'aleh — rov of Serdahely",
        seforim: "יהודה יעלה · דברי מהרי״א",
        note: "One of the leading poskim of Hungarian Jewry, rov here from 1852 until his petirah in 1866. Written Aszód or Aszod in Hungarian and Slovak sources.",
      },
    ],
    sourceUrl: "https://www.jewishgen.org/Yizkor/pinkas_slovakia/slo143.html",
  },
  {
    slug: "piestany-nitra-rov",
    city: "Piešťany (Pöstyén)",
    yiddishCity: "פּעשטיאַן",
    name: "Piešťany — kever of the Nitra Rov",
    yiddishName: "פּעשטיאַן — קבר הרב מניטרא",
    country: "Slovakia",
    address:
      "Jewish cemetery, eastern edge of Piešťany near the railway line, Trnava Region, Slovakia — no street address is published here; confirm the entrance locally",
    airportRef: "48.594, 17.827",
    arrivalNotes: [
      "The Nitra Rov is buried here, not in Nitra — he was born in this town and was brought back to it. Almost everything written about him says Nitra, so people go to the wrong place. Piešťany is about 35 km north of Nitra.",
      "The cemetery is on a hillside above the town, on a partly terraced slope towards the eastern edge near the railway. The oldest stone is from 1880 and the last burial was in 1955. It is owned by the municipality and has been restored through a local civic effort.",
      "The cemetery chapel was rebuilt by the German army at the end of the war into a pillbox, and that structure is still there — it is not a building to daven in, and it will not look like an ohel.",
    ],
    burials: [
      {
        name: "Rabbi Shmuel Dovid Ungar of Nitra",
        yiddishName: "רבי שמואל דוד אונגאר מניטרא",
        knownAs: "The Nitra Rov — rosh yeshiva of the last yeshiva open in occupied Europe",
        note: "Rov of Nitra and rosh yeshiva there from 1931; the yeshiva kept going after every other in occupied Europe had been closed. Father-in-law of Reb Chaim Michoel Dov Weissmandl. He was niftar on 9 February 1945 while in hiding, and is buried in the town he came from.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Shmuel_Dovid_Ungar",
  },
];
