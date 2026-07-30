// Bulk kevarim — batch 15. France, which had none.
//
// Eleven things to do in France, two places to stay, two quarters — and not one
// kever, in a country with one of the oldest continuous Jewish presences in
// Europe and where Rashi taught.
//
// IMPORTANT (safety): no grave GPS is invented. Navigate by the address and
// confirm the stone on the ground.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries15: Cemetery[] = [
  {
    slug: "metz-shaagas-aryeh",
    city: "Metz",
    yiddishCity: "מעץ",
    name: "Metz — kever of the Shaagas Aryeh",
    yiddishName: "מעץ — קבר בעל שאגת אריה",
    country: "France",
    address: "Jewish cemetery, Metz, Moselle, Grand Est, France — ask the Metz community; no street address is published here",
    arrivalNotes: [
      "Metz was one of the great kehillos of pre-revolutionary France, with a beis din of standing, and it is where the Shaagas Aryeh spent the last twenty years of his life.",
      "He came late. He was rov in Minsk and then Volozhin, and was already about seventy when Metz took him in 1765; he held the post until he was niftar there in 1785 at about ninety.",
      "The Metz kehilla is still there and is the right people to ask about the cemetery and about reaching the kever. We are not printing an opening time we could not stand behind.",
      "Metz is in Lorraine, about ninety minutes from Paris on the TGV and half an hour from Luxembourg — easy to reach, and almost nobody does.",
    ],
    accessNote:
      "Ask the Jewish community of Metz before travelling. A historic ground rather than a maintained visitor site; do not assume an open gate.",
    burials: [
      {
        name: "Rabbi Aryeh Leib ben Asher Gunzberg",
        yiddishName: "רבי אריה לייב בן אשר גינצבורג",
        knownAs: "The Shaagas Aryeh",
        seforim: "שאגת אריה · טורי אבן · גבורת ארי",
        yahrzeit: "ט״ו תמוז · 23 June 1785",
        note: "One of the sharpest lamdanim of the eighteenth century, and among the very few whose sefer is known by his own name — a Shaagas Aryeh is a person and a sefer at once. Born about 1695, rov in Minsk and then Volozhin, and from 1765 rov of Metz, where he was niftar in 1785 at about ninety. The Turei Even on Megillah and Chagigah is his, and is still learnt.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Aryeh_Leib_ben_Asher_Gunzberg",
  },
];
