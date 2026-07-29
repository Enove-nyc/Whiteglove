// Bulk kevarim — batch 9. The first entries outside Eastern Europe.
//
// Every kever on the site until now was in Poland, Ukraine, Hungary, Slovakia,
// Lithuania, Belarus, Romania, Bohemia, Austria, Israel or the United States.
// Morocco — where hilulos draw more people than most of the Polish towns here
// put together — had nothing at all, and neither did Germany, where the oldest
// standing Jewish cemetery in Europe is.
//
// IMPORTANT (safety): who is buried where, and in which town, comes from public
// sources; each entry carries one. We do NOT invent a grave GPS. `airportRef`
// is a CITY-level point used only to rank the nearest airports — it is NOT a
// grave location and must never be used to navigate. Grave navigation uses the
// address, and the exact kever is confirmed on the ground.
//
// Two silences kept from the earlier batches. No caretaker's name or number is
// printed until the owner has confirmed it still reaches somebody — which
// matters more here than anywhere else on the site, because several of these
// are behind a locked gate that only a person opens. And a yahrzeit is written
// only where a source gives the Hebrew date; a civil date converted by hand is
// a guess, and a guess about a yahrzeit is worse than nothing.
//
// One thing to know about the Moroccan entries. A hilula is not a quiet visit.
// On the day, these are crowds of thousands with catering, singing and coaches;
// on every other day of the year several of them are a locked door and a
// caretaker who may or may not be there. Which of those two you are travelling
// into is the single most important thing to establish before you book.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries9: Cemetery[] = [
  {
    slug: "asjen-ouezzane-amram-ben-diwan",
    city: "Asjen / Ouezzane (Wazzan)",
    yiddishCity: "אוּאַזאַן",
    name: "Asjen — kever of Rabbi Amram ben Diwan",
    yiddishName: "אַסזשען — קבר רבי עמרם בן דיוואן",
    country: "Morocco",
    address:
      "Jewish cemetery at Asjen (Azjen), about 6 km north-west of Ouezzane, Tanger-Tétouan-Al Hoceïma region, Morocco — no street address is published here; the site is reached by the Ouezzane road and confirmed locally",
    airportRef: "34.796, -5.578",
    arrivalNotes: [
      "The kever is not in Ouezzane itself. It is in the village of Asjen, roughly 6 km north-west of the town, and directions that stop at Ouezzane leave you short. Ouezzane is a Sufi town with its own pilgrimage traffic, which is a further reason to be specific about where you are going.",
      "There is no matzeivah to look for. The grave is a mound of stones under a large old olive tree, thick with candle wax left by people who came before. Beside it are a synagogue and rooms built for pilgrims, so the site is more than the grave — but the grave itself is the tree and the stones.",
      "The hilula is on Lag BaOmer and it is the largest Jewish pilgrimage in Morocco. Going on the day and going on an ordinary Tuesday are two completely different journeys: one is thousands of people, catering and coaches, the other may be a caretaker and a key. Decide which you are doing before you book anything.",
      "We are not printing a gate contact or an opening time, because we could not stand behind either. Ask the Council of Jewish Communities of Morocco, or whoever is organising the hilula that year, before you set out.",
    ],
    burials: [
      {
        name: "Rabbi Amram ben Diwan",
        yiddishName: "רבי עמרם בן דיוואן",
        knownAs: "The tzaddik of Ouezzane",
        note: "Born in Jerusalem and living in Chevron, he was sent to Morocco in 1743 as an emissary raising funds for the yishuv in Eretz Yisroel, and stayed to teach. He was niftar in 1782 on a return visit to Ouezzane and was buried at Asjen. He is among the most visited kevarim in Morocco, and among Moroccan Jews the one most associated with refuos.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Amram_ben_Diwan",
  },
  {
    slug: "essaouira-mogador-chaim-pinto",
    city: "Essaouira (Mogador)",
    yiddishCity: "מוגאדור",
    name: "Mogador — the old bais hachaim by the sea, kever of Rabbi Chaim Pinto",
    yiddishName: "מוגאדור — בית החיים הישן",
    country: "Morocco",
    address:
      "Old Jewish cemetery, outside Bab Doukkala on the seaward side, Essaouira, Marrakech-Safi region, Morocco — no street address is published here; the entrance is through the new cemetery opposite",
    airportRef: "31.513, -9.770",
    arrivalNotes: [
      "There are two Jewish cemeteries here, facing each other, and the kever is in the older one — the sea cemetery, separated from the Atlantic by a single wall. Leave the medina through Bab Doukkala and follow the shore.",
      "The way in is through the NEW cemetery. Knock there and ask the guard to open the old cemetery and the mausoleum; both are kept locked. That is the normal arrangement, not a sign that you have come at a bad time — but it does mean turning up with nobody there gets you a locked door and a wall.",
      "Rabbi Chaim Pinto's kever has had a mausoleum over it since 1998, so it is not one of the weathered stones in the field — it is the built structure, and the guard will take you to it.",
      "The hilula on 26 Elul is one of the largest in North Africa, drawing well over a thousand people. Outside those days the cemetery is quiet and the town is an ordinary seaside town.",
      "We are not publishing a name, a number or an opening time for the guard, because we have not confirmed one that still reaches anybody. Ask through the Casablanca kehilla or a guide who works the coast.",
    ],
    burials: [
      {
        name: "Rabbi Chaim Pinto",
        yiddishName: "רבי חיים פינטו",
        knownAs: "The Rov of Mogador",
        yahrzeit: "כ״ו אלול · 5605 / 1845",
        note: "1748–1845, the leading rov of Mogador in its years as Morocco's Atlantic trading port, and the head of the Pinto family whose descendants carry the name today.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jewish_cemeteries,_Essaouira",
  },
  {
    slug: "fez-mellah-bais-hachaim",
    city: "Fez (Fès)",
    yiddishCity: "פֿעז",
    name: "Fez — the bais hachaim in the mellah",
    yiddishName: "פֿעז — בית החיים",
    country: "Morocco",
    address:
      "Jewish cemetery at the southern end of the mellah, Fès el-Jdid, Fez, Fès-Meknès region, Morocco — no street number is published here; confirm the gate on the ground",
    airportRef: "34.063, -5.003",
    arrivalNotes: [
      "This is one of the largest Jewish burial grounds in the country — around 22,000 kevarim, whitewashed and packed close, at the bottom end of the mellah in Fès el-Jdid. It is not the medina; the mellah is its own quarter and the cemetery is at the far end of it.",
      "It was restored in full in 2015, along with three small shuls inside the walls that now serve as a place to daven and a small museum. Of the Moroccan sites in this batch it is the one most likely to be open and tended when you arrive.",
      "Finding a specific kever among 22,000 near-identical whitewashed graves is not something to attempt cold. The larger ones — Rabbi Yehuda ben Attar's among them, tiled and with a niche for candles — are known to the people who work there.",
      "Fez is four to five hours by road from Casablanca and about three from Rabat, so it is usually a night rather than a day trip.",
    ],
    burials: [
      {
        name: "Rabbi Yehuda ben Attar",
        yiddishName: "רבי יהודה בן עטר",
        knownAs: "Rabbi al-Kabbir — the great one of Fez",
        note: "1655–1733. Born in Fez and av beis din there, and head of the dayanim of Morocco, a position he took without payment. Not to be confused with Rabbi Chaim ben Attar the Or HaChaim, who is buried on Har HaZeisim, nor with his grandfather Rabbi Chaim ben Attar the Elder of Salé.",
      },
      {
        name: "Solica Hachuel",
        yiddishName: "סוליקא הצדיקת",
        knownAs: "Solica HaTzaddikas — Lalla Souliqa",
        note: "Born in Tangier in 1817 and put to death in Fez in 1834, at seventeen, for refusing to leave Yiddishkeit. Her kever is visited by Jews and Muslims alike.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Sol_Hachuel",
  },
  {
    slug: "marrakech-miaara",
    city: "Marrakech",
    yiddishCity: "מאַראַקעש",
    name: "Marrakech — the Miaara bais hachaim",
    yiddishName: "מאַראַקעש — בית החיים מיעארה",
    country: "Morocco",
    address:
      "Miaara Jewish cemetery, in the mellah, Marrakech, Marrakech-Safi region, Morocco — no street number is published here; confirm the gate on the ground",
    airportRef: "31.630, -8.008",
    arrivalNotes: [
      "The largest Jewish cemetery in Morocco, walled, inside the mellah, and still looked after by the small kehilla that remains in the city. It has been in use since the fifteenth century and parts of the ground are older than that.",
      "Kohanim are marked in blue paint on the stones, which is worth knowing before you walk the rows — it is how the ground is read here, and it is not a decoration.",
      "There are caretakers on site who will walk visitors to the kevarim people come for. As everywhere in this batch, we are not printing their names or numbers until the owner has confirmed one.",
      "A caution about one name in particular. Lists of who is buried here sometimes include Rabbi Avraham Azulai. The Azulai of the Chesed L'Avraham was born in Fez but moved to Chevron in 1599 and is buried in the ancient cemetery there, not in Morocco. Azulai is a common Moroccan family name and there is more than one; do not travel to Marrakech expecting the Chesed L'Avraham.",
    ],
    burials: [
      {
        name: "Rabbi Hanania HaCohen",
        yiddishName: "רבי חנניה הכהן",
        note: "One of the tzaddikim of Marrakech whose kever draws visitors here, and a focus of the hilulos held at the cemetery.",
      },
      {
        name: "Rabbi Pinchas HaCohen",
        yiddishName: "רבי פנחס הכהן",
        note: "Buried in the same ground, and remembered in Marrakech for his standing with the city's rulers in his lifetime.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jewish_cemetery,_Marrakesh",
  },
  {
    slug: "worms-heiliger-sand",
    city: "Worms",
    yiddishCity: "װאָרמײַזא",
    name: "Wormaisa — the Heiliger Sand, the oldest bais hachaim in Europe",
    yiddishName: "װאָרמײַזא — בית החיים הישן",
    country: "Germany",
    address: "Willy-Brandt-Ring 21, 67547 Worms, Germany",
    airportRef: "49.633, 8.359",
    arrivalNotes: [
      "The oldest Jewish cemetery still standing in Europe. The earliest stone that can still be read is from 1058, and around two thousand kevarim survive — through the medieval expulsions, through the pogroms, and through the churban, without the ground being cleared. There is almost nothing else in Europe that can be said of.",
      "Closed on Shabbos and on yomim tovim, and open Sunday to Friday. The times are seasonal and have been changing, so check the current ones with the city before you travel rather than trusting a figure printed anywhere — including here. There is a visitor centre at the gate and guided tours are run.",
      "The two kevarim people come for stand side by side. The Maharam of Rothenburg was niftar in 1293 in imprisonment, and his body was held for ransom for fourteen years; Alexander ben Shlomo Wimpfen paid to redeem it and asked only to be buried beside him. He was.",
      "Worms is one of the three ShUM cities with Speyer and Mainz, listed together by UNESCO in 2021. Most people come for all three; Mainz is about 45 km north and Speyer about 50 km south, so the three are a comfortable day by car.",
    ],
    burials: [
      {
        name: "Rabbi Meir of Rothenburg",
        yiddishName: "רבי מאיר מרוטנבורג",
        knownAs: "The Maharam of Rothenburg",
        note: "The leading posek of Ashkenaz in his generation and rebbe of the Rosh. Held in imprisonment from 1286 and niftar there in 1293; he forbade the kehilla to ransom him, so as not to set the price of a rov. His body was held a further fourteen years.",
      },
      {
        name: "Alexander ben Shlomo Wimpfen",
        yiddishName: "רבי אלכסנדר בן שלמה וימפן",
        note: "Niftar 1307. He paid to redeem the Maharam's body for burial, and asked as his only payment to be buried at his side.",
      },
      {
        name: "Rabbi Yaakov ben Moshe Levi Moelin",
        yiddishName: "רבי יעקב בן משה הלוי מולין",
        knownAs: "The Maharil — from whom Ashkenazi minhag is largely written",
        seforim: "ספר מהרי״ל",
        note: "Niftar 1427. The Sefer Maharil, written down by his talmid, is the source a great deal of Ashkenazi minhag is traced back to, and the Rema leans on it throughout.",
      },
    ],
    sourceUrl: "https://en.wikipedia.org/wiki/Jewish_Cemetery,_Worms",
  },
];
