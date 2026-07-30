// Bulk kevarim — batch 13. Italy, which had none.
//
// The site carried fifteen things to do in Italy, four places to stay, four
// quarters — and not one kever. That is a strange shape for a country with a
// continuous Jewish presence longer than almost anywhere in Europe, where the
// Rambam's responsa travelled, where Sephardim landed after 1492, and where the
// Ramchal was born.
//
// IMPORTANT (safety): no grave GPS is invented. This batch carries none.
//
// TWO OF THESE THREE ARE ABOUT ABSENCE AS MUCH AS PRESENCE, and that is the
// honest shape of Jewish Italy. Livorno's great cemetery went under a public
// park and a road, and the CHIDA was taken out of it and reburied in
// Yerushalayim in 1960. Mantua's Ramaz has a documented epitaph and a stone
// whose present whereabouts we could not confirm. Neither is a reason to leave
// the entries out; both are reasons to say what is and is not known.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries13: Cemetery[] = [
  {
    slug: "venice-lido-antico-cimitero",
    city: "Venice (Lido)",
    yiddishCity: "װענעדיג",
    name: "The Antico Cimitero Ebraico on the Lido",
    yiddishName: "װענעדיג — דער אַלטער בית החיים",
    country: "Italy",
    address: "Antico Cimitero Ebraico, Riviera San Nicolò, Lido di Venezia, Italy",
    arrivalNotes: [
      "GUIDED TOUR ONLY. The gate is locked and the visit is arranged through the Museo Ebraico in the Cannaregio ghetto — book there, not at the cemetery. You can see a fair amount through the railings if you arrive without a booking, but that is all.",
      "Founded in 1386, after the Chioggia war, when Venice let the Jews back in and gave them ground on the San Nicolò shore. The monks disputed it; in 1389 it was settled on the community for good.",
      "Twelve hundred stones were catalogued in the 1999 restoration, running from the first half of the 16th century to the second half of the 18th.",
      "Look at the carving. The designs run from Venetian Gothic to distinctly Ottoman, and some carry a lion that is not St Mark's but Castile and León's — brought here on the arms of Sephardim expelled from Spain in 1492. The stones are the record of who arrived and when.",
      "The Lido is a vaporetto from the city. Pair it with the Ghetto itself, which is already on this site.",
    ],
    accessNote:
      "Locked. Visits are by guided tour through the Museo Ebraico di Venezia and run seasonally rather than daily — check before you plan the day around it.",
    burials: [
      {
        name: "The Jews of Venice, 1386 to the 18th century",
        yiddishName: "קהילת װענעדיג",
        knownAs: "Twelve hundred catalogued stones",
        note: "This is a communal beis hachaim rather than the kever of one tzaddik: five centuries of the Venetian kehilla, Italian and Ashkenazi and Levantine and Sephardi, in one ground. The stones themselves are the reason to come — they are a written record of the expulsions that filled this city.",
      },
    ],
    sourceUrl: "https://www.museoebraico.it/en/ancient-cemetery/",
  },
  {
    slug: "mantua-moshe-zacuto",
    city: "Mantua (Mantova)",
    yiddishCity: "מאַנטובה",
    name: "Mantua — the kever of the Ramaz, Rabbi Moshe Zacuto",
    yiddishName: "מאַנטובה — קבר הרמ״ז",
    country: "Italy",
    address: "Mantua, Lombardy, Italy — ask the Jewish community of Mantua; no address is published here (see the note below)",
    arrivalNotes: [
      "READ THIS BEFORE YOU TRAVEL. What is documented is that the Ramaz served as rov and rosh yeshiva in Mantua for around twenty-four years and was niftar there on the second day of Succos, 1697, and that the epitaph on his funerary stone is recorded in the scholarly literature. What we could NOT establish from any source is where that stone stands today. Mantua's Jewish burial grounds have not had an undisturbed history.",
      "So this is listed as a place to ask about rather than a place to navigate to. The Jewish community of Mantua is the right people to ask, and if they can show you, that is worth more than anything printed here.",
      "Mantua itself is worth the stop regardless — it was one of the great centres of Italian Jewry, with a Hebrew printing tradition and a kehilla that produced the leading kabbalist of his century.",
      "Two hours from Milan and forty minutes from Verona, which is already on this site's things-to-do list. There is no kosher food in Mantua; carry it from Milan.",
    ],
    accessNote:
      "No confirmed location. Contact the Jewish community of Mantua before travelling, and do not daven by a stone on the strength of this listing.",
    burials: [
      {
        name: "Rabbi Moshe ben Mordechai Zacuto",
        yiddishName: "רבי משה בן מרדכי זכות",
        knownAs: "The Ramaz — the exact kever is NOT confirmed",
        seforim: "קול הרמ״ז · שורשי השמות · תופתה ערוך",
        yahrzeit: "ב׳ דחג הסוכות · 1 October 1697",
        note: "Born about 1625 into a Portuguese anusim family in Amsterdam and taught by Rabbi Shaul Levi Morteira, he moved to Italy and lived in Venice, Verona and finally Mantua, where he was rov for the last twenty-four years of his life. In his own lifetime he was held to be the foremost kabbalist in Italy. The epitaph on his stone is recorded in the scholarly literature; where the stone now stands, we could not confirm.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Moses_ben_Mordecai_Zacuto",
  },
  {
    slug: "livorno-old-jewish-cemetery",
    city: "Livorno (Leghorn)",
    yiddishCity: "ליװאָרנאָ",
    name: "Livorno — where the CHIDA was buried, and no longer is",
    yiddishName: "ליװאָרנאָ",
    country: "Italy",
    address: "Livorno, Tuscany, Italy — the old Jewish cemetery; see the note below before planning a visit",
    arrivalNotes: [
      "THE CHIDA IS NOT HERE ANY MORE. This entry exists because people still come looking for him. Rabbi Chaim Yosef Dovid Azulai was niftar in Livorno in 1806 and buried here; in 1960 his remains were taken to Eretz Yisroel and reinterred on Har HaMenuchos, where he is listed on this site.",
      "The reason for the move was that the Italian authorities planned to turn the cemetery into a public park with a road running through it. Chief Rabbi Yitzchak Nissim began the work in 1956, obtained the Livorno community's agreement, secured a 600-square-metre plot on Har HaMenuchos and built an ohel over it. The reinterment was on 20 Iyar 5720 — 17 May 1960 — a hundred and fifty-four years after his petirah, and it answered his own written wish to return.",
      "Livorno was one of the great Sephardi cities of Europe, a free port where Jews were invited to settle under the Livornina charters and were never confined to a ghetto. That is why the CHIDA, a Yerushalmi, ended his life here.",
      "If you are in Tuscany for the CHIDA, the place to daven is Yerushalayim, not Livorno. If you are in Livorno anyway, the community is the right people to ask what of the old ground remains.",
    ],
    accessNote:
      "Do not plan a kever visit here. The ground was redeveloped and the one kever most people come for was moved to Yerushalayim in 1960.",
    burials: [
      {
        name: "Rabbi Chaim Yosef Dovid Azulai — moved to Yerushalayim in 1960",
        yiddishName: "רבי חיים יוסף דוד אזולאי",
        knownAs: "The CHIDA — now on Har HaMenuchos, NOT in Livorno",
        seforim: "שם הגדולים · ברכי יוסף · חיים שאל",
        yahrzeit: "י״א אדר · 1 March 1806",
        note: "Born in Yerushalayim in 1724, shadar, bibliophile and one of the most prolific poskim of his age; the Shem HaGedolim is still the starting point for anyone tracing a sefer or its author. He was niftar in Livorno in 1806 and buried here. His remains were reinterred on Har HaMenuchos in Yerushalayim on 20 Iyar 5720 / 17 May 1960, under an ohel built for him. He is listed on this site at Har HaMenuchos, which is where to go.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Chaim_Yosef_David_Azulai",
  },
];
