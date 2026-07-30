// Bulk kevarim — batch 12. Three countries the site had none in.
//
// The Netherlands, Turkey, and the north of Germany. Between them they close
// three of the larger holes left after eleven batches: the Sephardi world of
// Amsterdam, the Sephardi world of Anatolia, and the Ashkenazi north where
// Emden and Eybeschutz are buried in the same ground.
//
// All three pair with things the site already carries. Amsterdam now has
// attractions and a quarter and had no kever within reach; Hamburg has Miniatur
// Wunderland and nothing else; and Izmir is the first Turkish entry of any kind.
//
// IMPORTANT (safety): who is buried where comes from public sources, and every
// entry carries one. No grave GPS is invented — this batch carries none at all.
// Navigate by the address and confirm the kever on the ground.
//
// ONE THING WORTH READING BEFORE THE IZMIR ENTRY. Rabbi Chaim Palachi's kever
// is not where he was first buried. He was laid in the Bahri Baba cemetery in
// 1868 and moved to Gürçeşme in 1924, which is a fact worth carrying because
// old directions and old seforim will send you to the wrong ground.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries12: Cemetery[] = [
  {
    slug: "ouderkerk-beth-haim",
    city: "Ouderkerk aan de Amstel",
    yiddishCity: "אויסטערקערק",
    name: "Beth Haim — the Portuguese bais hachaim of Amsterdam",
    yiddishName: "בית חיים — אויסטערקערק",
    country: "Netherlands",
    address: "Kerkstraat 10, 1191 JB Ouderkerk aan de Amstel, Ouder-Amstel, Noord-Holland, Netherlands",
    arrivalNotes: [
      "Founded in June 1614 and the oldest Jewish cemetery in the Netherlands. Ten acres and more than twenty-eight thousand kevarim, and it is still the burial ground of the Portuguese kehilla of Amsterdam.",
      "It is out of the city — about ten kilometres south-east of central Amsterdam, in a village on the Amstel. Not a walk; plan it as a half day with the journey.",
      "The stones are flat Sephardi ledgers, many of them carved with figures, and a good number have sunk into the peat at angles. That is the character of the place and not neglect.",
      "The Esnoga in Amsterdam is the kehilla this ground belongs to, and it is already listed on this site — the two are one visit intellectually even though they are half an hour apart.",
      "Opening times are set by the Portuguese kehilla and we are not printing them, because they change. Check with the community before travelling out.",
    ],
    accessNote:
      "Working cemetery of the Portuguese-Israelite community, open to visitors at set times rather than freely. Men cover the head. Check the current arrangements with the kehilla in Amsterdam before setting out.",
    burials: [
      {
        name: "Rabbi Menasseh ben Israel",
        yiddishName: "רבי מנשה בן ישראל",
        knownAs: "Who got the Jews readmitted to England",
        yahrzeit: "1657",
        note: "Rov, printer and diplomat in Amsterdam, and the man who went to London and argued the case to Oliver Cromwell that brought the Jews back to England after three and a half centuries of expulsion. He set up the first Hebrew press in Amsterdam, and he was a neighbour of Rembrandt, who etched him.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Beth_Haim_of_Ouderkerk_aan_de_Amstel",
  },
  {
    slug: "altona-hamburg-koenigstrasse",
    city: "Altona (Hamburg)",
    yiddishCity: "אַלטאָנא",
    name: "The Altona bais hachaim on Königstraße",
    yiddishName: "אַלטאָנא — בית החיים",
    country: "Germany",
    address: "Jüdischer Friedhof Altona, Königstraße 10a, 22767 Hamburg, Germany",
    arrivalNotes: [
      "Laid out between 1611 and 1616 and used for burials until 1869. Two hectares, and on the UNESCO tentative list for the number of people of consequence buried in it.",
      "There are two grounds here, Sephardi and Ashkenazi, side by side — Portuguese ledger stones on one side and upright Ashkenazi matzeivos on the other, which is a thing you can see in very few places.",
      "The Eduard Duckesz Haus at the entrance is where visits are arranged. It is not an open gate: check the arrangements before you come rather than turning up.",
      "In Altona, which is central Hamburg — twenty minutes from Miniatur Wunderland, which is on this site's things-to-do list and is the other reason families come to Hamburg.",
    ],
    accessNote:
      "Not freely open. Visits go through the Eduard Duckesz Haus at the cemetery entrance and are usually arranged in advance. A kohen should note that both grounds are burial grounds throughout.",
    burials: [
      {
        name: "Rabbi Yonasan Eybeschutz",
        yiddishName: "רבי יהונתן אייבשיץ",
        knownAs: "The Kreisi U'Pleisi — rov of the Three Communities",
        seforim: "כרתי ופלתי · אורים ותומים · יערות דבש",
        yahrzeit: "18 September 1764",
        note: "Rov of Altona, Hamburg and Wandsbek, and one of the great talmidei chachomim of his century — the Urim V'Tumim on Choshen Mishpat and the Kreisi U'Pleisi on Yoreh Deah are learnt to this day.",
      },
      {
        name: "Rabbi Yaakov Emden",
        yiddishName: "רבי יעקב עמדין",
        knownAs: "The Yaavetz",
        seforim: "שאילת יעב״ץ · סידור בית יעקב · מור וקציעה",
        note: "Son of the Chacham Tzvi, and the man who spent years accusing Rabbi Yonasan Eybeschutz of Sabbatianism in a controversy that split European Jewry down the middle. They are buried in the same cemetery. Whatever a person makes of the machlokes, standing in that ground with both of them in it is the part nobody forgets.",
      },
    ],
    sourceUrl: "https://whc.unesco.org/en/tentativelists/5973/",
  },
  {
    slug: "izmir-gurcesme-chaim-palachi",
    city: "Izmir (Smyrna)",
    yiddishCity: "איזמיר",
    name: "Gürçeşme — kever of Rabbi Chaim Palachi",
    yiddishName: "איזמיר — קבר רבי חיים פאלאג׳י",
    country: "Turkey",
    address: "Gürçeşme Jewish cemetery, Gürçeşme Caddesi 86-116, Izmir, Turkey",
    arrivalNotes: [
      "GO TO GÜRÇEŞME, NOT TO BAHRI BABA. Rabbi Chaim Palachi was buried in the Bahri Baba cemetery when he was niftar in 1868, and his remains were moved to Gürçeşme in 1924. Older seforim and older directions still point at the first ground, and people lose a morning to it.",
      "His son Rabbi Avraham Palachi is buried beside him, and the two together are the reason people come.",
      "Izmir was one of the great Sephardi kehillos of the Ottoman world and there is more here than the one kever — several historic synagogues survive in the Kemeraltı bazaar area and have been under restoration.",
      "Gravestones at this cemetery were vandalised in recent years. That is not a reason to stay away, but the community keeps the site closed rather than open, so arrange the visit through the Izmir Jewish community rather than arriving at a gate.",
    ],
    accessNote:
      "Closed cemetery — access is arranged through the Jewish community of Izmir, not by turning up. Bring a passport; Turkish sites of this kind usually want identification.",
    burials: [
      {
        name: "Rabbi Chaim Palachi",
        yiddishName: "רבי חיים פאלאג׳י",
        knownAs: "The Chikekei Lev — Chacham Bashi of Izmir",
        seforim: "חקקי לב · כף החיים · תוכחת חיים",
        yahrzeit: "י״ז שבט · 10 February 1868",
        note: "Born in Izmir in 1788 and Chacham Bashi — chief rabbi — of the city. He wrote prolifically in halachah and mussar; the Kaf HaChaim here is his and is not the later sefer of the same name by Rabbi Yaakov Chaim Sofer. His kever is the most visited in the cemetery.",
      },
      {
        name: "Rabbi Avraham Palachi",
        yiddishName: "רבי אברהם פאלאג׳י",
        knownAs: "Son of the Chikekei Lev, and rov of Izmir after him",
        note: "Buried beside his father at Gürçeşme.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Haim_Palachi",
  },
];
