// Bulk kevarim — batch 16. Three towns from the directory that had no beis
// hachaim written, so their pages showed nothing.
//
// These are researched rather than derived. Everything below is from a named
// public source and nothing is filled in from general knowledge: where a
// source disagreed with itself or with what is well established, the claim is
// left out rather than repeated. One Mád source calls the ohel there "the
// Levush" — the Levush is Rabbi Mordechai Yoffe and he is buried in Poznań, so
// that name is not in this file.
//
// IMPORTANT (safety): no grave GPS is invented. Navigate by the address and
// confirm the stone on the ground. Where the burial ground is not in the town
// it is named for, the arrival notes say so first — that is the single most
// useful line on a page like this.

import type { Cemetery } from "@/data/cemeteries";

export const bulkCemeteries16: Cemetery[] = [
  {
    slug: "holesov-shach",
    city: "Holešov",
    yiddishCity: "האלעשוי",
    name: "Holešov — kever of the Shach",
    yiddishName: "האלעשוי — ציון בעל שפתי כהן",
    country: "Czech Republic",
    address: "Jewish cemetery, Hankeho, 769 01 Holešov, Zlín Region, Czech Republic",
    // Town-level pin for ranking only — never a grave location.
    airportRef: "49.333, 17.575",
    arrivalNotes: [
      "The cemetery is on Hankeho, a short walk from the Šach Synagogue on Příční — the synagogue is named after this kever, and is the easier landmark to navigate to.",
      "The Shach lies under a baroque tomb, and it is the one people come for. About a thousand matzevos stand here, the oldest from 1647, so allow time to find it rather than expecting it at the gate.",
      "Access runs on the synagogue's season, not the cemetery's: April to October it opens at weekends and through the week in high summer; November to March it is for pre-arranged groups only. Ring before travelling, particularly out of season.",
    ],
    accessContacts: [
      {
        label: "Šach Synagogue, Holešov",
        phone: "+420 573 397 822",
        note: "The synagogue beside the cemetery, which handles visits and out-of-season access. Confirm opening before you travel — the winter months are by arrangement only.",
      },
    ],
    burials: [
      {
        name: "Rabbi Shabbatai ben Meir HaKohen",
        yiddishName: "רבי שבתי בן מאיר הכהן",
        knownAs: "The Shach",
        seforim: "שפתי כהן",
        yahrzeit: "א׳ אדר · 5423 / 1663",
        note: "Author of the Sifsei Kohen on Shulchan Aruch — the Shach that every later posek argues with. He fled the Chmielnicki massacres of 1648–49, came west, and served as rov of Holešov until his petirah. His is the baroque tomb the town's synagogue is named after.",
      },
    ],
    sourceUrl: "https://jguideeurope.org/en/region/czech-republic/moravia/holesov/",
  },
  {
    slug: "tisinec-stropkov",
    city: "Stropkov (Tisinec)",
    yiddishCity: "סטראפקוב",
    name: "Tisinec — ohel of the Stropkover Rov",
    yiddishName: "טיסינעץ — אוהל הסטראפקאווער רב",
    country: "Slovakia",
    address: "Jewish cemetery, Tisinec, near Stropkov, Prešov Region, Slovakia",
    airportRef: "49.217, 21.650",
    arrivalNotes: [
      "THE CEMETERY IS NOT IN STROPKOV. The Jews of Stropkov and the villages around it buried their dead at Tisinec, a small village just outside the town — navigating to Stropkov itself is the usual way people miss this kever.",
      "The ohel over the Stropkover Rov is a small building on the ground. The cemetery has been badly overgrown at times and the ohel has been described as nearly invisible in the undergrowth, so go with somebody who has been, or arrange it in advance.",
      "His descendants gather here on his yahrzeit, 4 Adar I. In a leap year that is the date to work to; ask locally which day is being kept in a year that has only one Adar.",
    ],
    accessContacts: [
      {
        label: "Committee for Preservation of the Tisinec / Stropkov Cemeteries",
        note: "The committee that looks after the ground and organises the yahrzeit gathering. Published address: 1622 52nd Street, Brooklyn, NY 11204. No public phone is published here — write, or ask through a heritage tour operator.",
      },
    ],
    burials: [
      {
        name: "Rabbi Chaim Yosef Gottlieb",
        yiddishName: "רבי חיים יוסף גאטליב",
        knownAs: "The Stropkover Rov",
        seforim: "טיב גיטין וקידושין",
        yahrzeit: "ד׳ אדר א׳ · 5627 / 1867",
        note: "1794–1867. A talmid of the Chasam Sofer, and appointed rov and av beis din of Stropkov on the recommendation of the Divrei Chaim of Sanz. He is buried at Tisinec rather than in Stropkov itself.",
      },
    ],
    sourceUrl: "https://kehilalinks.jewishgen.org/Stropkov/RabbisStropkov5.htm",
  },
  {
    slug: "mad-kol-aryeh",
    city: "Mád",
    yiddishCity: "מאד",
    name: "Mád — kever of the Kol Aryeh",
    yiddishName: "מאד — ציון בעל קול אריה",
    country: "Hungary",
    address: "Jewish cemetery, Mád, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.150, 21.283",
    arrivalNotes: [
      "The cemetery dates from 1769 and is walled, with a locking gate; it is kept in good order and stones from the seventeen and eighteen hundreds still stand.",
      "Mád is one stop on the Tokaj-Hegyalja route that links ten towns of the region and their kevarim, so it is rarely visited on its own — Tokaj, Szerencs and Sárospatak are all within an easy drive.",
      "The former rabbinical house in the town has been restored as a pilgrimage house. Ask there about entry to the cemetery before making the journey.",
    ],
    burials: [
      {
        name: "Rabbi Avraham Yehuda HaKohen Schwartz",
        yiddishName: "רבי אברהם יהודה הכהן שווארץ",
        knownAs: "The Kol Aryeh",
        seforim: "קול אריה",
        yahrzeit: "5643 / 1883",
        note: "1824–1883, av beis din of Mád and the name the town is known by in the seforim. Other rabbonim of Mád lie in the same ground; sources naming them disagree, so only this kever is recorded here until somebody has read the stones.",
      },
    ],
    sourceUrl: "https://footstepsofwonderrabbis.com/en/tourism/mad-and-its-region",
  },
];
