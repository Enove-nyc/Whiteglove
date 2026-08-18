// Bulk kevarim — batch 20. Four more directory towns.
//
// Same rules as before: named sources, nothing filled in from general
// knowledge, no invented GPS, and where a source is uncertain the page says so
// instead of choosing.
//
// TWO NAMES HERE COULD SEND SOMEBODY TO THE WRONG GROUND and are handled
// explicitly. The ohel in Prešov is recorded as holding a Stropkov rov — who
// is NOT the Stropkover Rov already on this site at Tisinec, a different man
// with a similar name who died a generation earlier. And Sárospatak's survey
// lists three rabbonim in transliterations nobody can turn back into Hebrew
// names with confidence, so it lists none.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries20: Cemetery[] = [
  {
    slug: "bobruisk-schneersohn",
    city: "Bobruisk",
    yiddishCity: "באברויסק",
    name: "Bobruisk — ohel of the last Kapuster Rebbe",
    yiddishName: "באברויסק — אוהל האדמו״ר מקאפוסט",
    country: "Belarus",
    address: "Jewish cemetery, Minskaya street, Bobruisk, Mogilev Region, Belarus",
    airportRef: "53.138, 29.225",
    arrivalNotes: [
      "This is the only Jewish burial ground left in the city, on Minskaya street. It was opened in 1921 — the year the rov himself was niftar, and he is the reason it exists.",
      "His kever is NOT in the row with the other rabbonim of Bobruisk. The chassidim asked for him to be buried apart, in a place of his own, precisely so that a building could be put up over it and people could come and daven there.",
      "The ground is being restored: paths cleared, undergrowth and fallen trees taken out. Later stages are meant to add proper paths and water. Expect work in progress rather than a finished site.",
    ],
    burials: [
      {
        name: "Rabbi Shmaryahu Noach Schneersohn",
        yiddishName: "רבי שמריהו נח שניאורסאהן",
        knownAs: "The Kapuster Rebbe — rov of Bobruisk",
        yahrzeit: "5681 / 1921",
        note: "1845–1921. A grandson of the Tzemach Tzedek and the third and last rebbe of the Kapust line of Chabad; rov of Bobruisk, and the founder of this cemetery.",
      },
    ],
    sourceUrl: "https://fjc-fsu.org/bobruisk-restoration-efforts-of-historic-jewish-cemetery-nears-completion-of-first-stage/",
  },
  {
    slug: "presov-orthodox-cemetery",
    city: "Prešov",
    yiddishCity: "פרעשאוו",
    name: "Prešov — the Orthodox Jewish cemetery",
    yiddishName: "פרעשאוו — בית החיים החרדי",
    country: "Slovakia",
    address: "Orthodox Jewish cemetery, Bikoš hill, Prešov, Prešov Region, Slovakia",
    airportRef: "48.998, 21.239",
    arrivalNotes: [
      "The cemetery is above the town on the slope of Bikoš — a plot of roughly 120 by 40 metres, in use since 1890, with about six hundred matzevos and a chapel at its western end.",
      "A path divides it: the northern half is the men's, the southern the women's, and only family tombs cross the line. Knowing that halves the search.",
      "A small ohel stands in the middle of the ground. THE ROV IN IT IS NOT THE STROPKOVER ROV whose ohel is at Tisinec — that is Reb Chaim Yosef Gottlieb, who was niftar in 1867, and this cemetery did not open until 1890. Two men, similar names, different grounds.",
      "The Orthodox synagogue of 1897–98 in the town can be visited, and the Bárkány collection of Judaica is kept upstairs there.",
    ],
    burials: [
      {
        name: "Rabbi Yaakov Yosef Guttmann",
        yiddishName: "רבי יעקב יוסף גוטמאן",
        knownAs: "Recorded as a rov of Stropkov",
        note: "The survey of this cemetery names him as the rov whose kever the ohel protects, in a Hungarianised spelling — Jankel Josef Guttmann. He is not Reb Chaim Yosef Gottlieb, the Stropkover Rov buried at Tisinec; that is a different man of an earlier generation. Confirm the stone before saying which Stropkover this is.",
      },
    ],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/slovakia/presov-presov",
  },
  {
    slug: "oswiecim-oshpitzin",
    city: "Oświęcim (Oshpitzin)",
    yiddishCity: "אושפיצין",
    name: "Oshpitzin — the Jewish cemetery",
    yiddishName: "אושפיצין — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, Dąbrowskiego, at the corner of Wysokie Brzegi, Oświęcim, Lesser Poland, Poland",
    airportRef: "50.038, 19.222",
    arrivalNotes: [
      "THE KEY IS AT THE JEWISH CENTRE, not at the gate — plac ks. Jana Skarbka 5, in the town. Collect it before going up to the cemetery.",
      "THE STONES NO LONGER MARK THE GRAVES. The Germans destroyed two thousand matzevos here. About a thousand were recovered and set back up in the nineteen-eighties, with money given by Asher Scharf of New York, but they stand where they were replaced rather than over the people they name.",
      "Two ohels stand on the ground: the Scharf family's, and one over Szymon Kluger, the last Jew of Oświęcim.",
      "This is the town's own Jewish cemetery, four centuries of a kehilla that lived here before the camp took the town's name. It is a different place from the camp memorial and is reached separately.",
    ],
    burials: [
      {
        name: "Rabbi Moshe Yaakov Yankiel Scharf",
        yiddishName: "רבי משה יעקב יאנקל שארף",
        knownAs: "In the Scharf family ohel",
        note: "Named in the survey as the most prominent of the Scharf family buried here; the ohel over them was given in the nineteen-eighties by Asher Scharf of New York, who paid for the cemetery's restoration.",
      },
    ],
    sourceUrl: "https://sztetl.org.pl/en/towns/o/546-oswiecim/114-cemeteries/26800-cmentarz-zydowski-w-oswiecimiu-ul-dabrowskiego",
  },
  {
    slug: "sarospatak-cemetery",
    city: "Sárospatak",
    yiddishCity: "שאראשפאטאק",
    name: "Sárospatak — the Jewish cemetery",
    yiddishName: "שאראשפאטאק — בית החיים",
    country: "Hungary",
    address: "Jewish cemetery, Arany János utca, toward Bodrogolaszi, Sárospatak, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.323, 21.573",
    arrivalNotes: [
      "THERE IS NO SIGN AND NO MARKER. The cemetery is flat, on the edge of the town along Arany János utca in the direction of Bodrogolaszi, behind a masonry wall. The gate is unlocked and anyone may go in — the difficulty is finding it, not entering it.",
      "It was opened at the end of the seventeen hundreds and the last burial was in 1950. Of its few hundred matzevos, something between a quarter and a half are down or broken.",
      "The survey names three rabbonim buried here, but only in Hungarianised spellings that cannot be turned back into their Hebrew names with any confidence, so this listing does not print them. Somebody who can read the stones would settle it in an afternoon.",
      "Sárospatak sits between Ijhel and the Tokaj towns, so it is nearly always part of a longer route rather than a journey of its own.",
    ],
    burials: [],
    sourceUrl: "https://cdp.jewishgen.org/eastern-europe/hungary/sarospatak",
  },
];
