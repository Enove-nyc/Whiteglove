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

/**
 * Batch 16b — four more directory towns.
 *
 * Slugs are prefixed with the directory town's own slug, so the existing
 * matching rule in data/destination-database.ts links them with no hand-written
 * pairing. That rule is `slug`, `slug-…` or `…-slug` and nothing looser, for
 * the reason written above it.
 *
 * CIECHANÓW IS NOT A PILGRIMAGE PAGE and must not read like one. The ohel
 * there was destroyed and the ground built over; a page implying somebody can
 * daven at a standing ohel would send them to a meadow. What the page says is
 * what is true.
 */
export const bulkCemeteries16b: Cemetery[] = [
  {
    slug: "kolin-old-cemetery",
    city: "Kolín",
    yiddishCity: "קאלין",
    name: "Kolín — the old Jewish cemetery",
    yiddishName: "קאלין — בית החיים הישן",
    country: "Czech Republic",
    address: "Old Jewish cemetery, Slunečná, 280 02 Kolín, Central Bohemia, Czech Republic",
    airportRef: "50.028, 15.200",
    arrivalNotes: [
      "Enter from Slunečná. The old main gate on Kmochova is closed, and navigating to it is the way people arrive at a locked wall.",
      "THE KEY IS HELD BY THE REGIONAL MUSEUM in Kolín, not at the cemetery. Arrange it before you travel rather than on the day.",
      "More than 2,600 matzevos stand here and the oldest are dated to 1492 — after Prague, this is the most significant old beis hachaim in Bohemia. Finding one stone among them takes time.",
    ],
    burials: [
      {
        name: "Rabbi Bezalel ben Yehuda Loew",
        yiddishName: "רבי בצלאל בן יהודה ליווא",
        knownAs: "Son of the Maharal of Prague",
        yahrzeit: "5359 / 1599",
        note: "A son of Rabbi Yehuda Loew, the Maharal of Prague. His father is buried in the old cemetery in Prague; this is the son, in Kolín.",
      },
      {
        name: "Rabbi Elazar Kalir",
        yiddishName: "רבי אלעזר קליר",
        knownAs: "Av beis din of Kolín",
        seforim: "אור חדש",
        note: "Rov of Kolín in the seventeen hundreds. Not the paytan Elazar HaKalir of the piyutim, who lived more than a thousand years earlier — the names are identical and the two are constantly confused.",
      },
    ],
    sourceUrl: "https://english.radio.cz/old-jewish-cemetery-kolin-8700541",
  },
  {
    slug: "boskovice-machatzis-hashekel",
    city: "Boskovice",
    yiddishCity: "באסקאוויץ",
    name: "Boskovice — kever of the Machatzis HaShekel",
    yiddishName: "באסקאוויץ — ציון בעל מחצית השקל",
    country: "Czech Republic",
    address: "Jewish cemetery, Boskovice, Blansko District, South Moravia, Czech Republic",
    airportRef: "49.488, 16.660",
    arrivalNotes: [
      "The cemetery is above the old Jewish quarter, which is itself worth the walk — Boskovice keeps one of the most complete Jewish quarters in Moravia.",
      "About 2,500 matzevos across some fourteen and a half thousand square metres, the oldest from 1670. It is one of the largest in the country, so know which kever you have come for.",
      "The Brno Jewish community pays a caretaker who maintains the ground; Boskovice is about thirty kilometres north of Brno, and arrangements are made through Brno.",
    ],
    burials: [
      {
        name: "Rabbi Shmuel HaLevi Kolin",
        yiddishName: "רבי שמואל הלוי קאלין",
        knownAs: "The Machatzis HaShekel",
        seforim: "מחצית השקל",
        yahrzeit: "5566 / 1806",
        note: "Author of the Machatzis HaShekel on Orach Chaim, printed alongside the Magen Avraham in most editions of Shulchan Aruch. His kever here is a place people come to daven.",
      },
      {
        name: "Rabbi Avraham Placzek",
        yiddishName: "רבי אברהם פלאצ׳ק",
        knownAs: "Landesrabbiner of Moravia",
        note: "Rov of Boskovice and acting chief rabbi of Moravia in the eighteen hundreds.",
      },
    ],
    sourceUrl: "https://jguideeurope.org/en/region/czech-republic/moravia/boskovice/",
  },
  {
    slug: "abaujszanto-shemen-rokeach",
    city: "Abaújszántó",
    yiddishCity: "אבאוי סאנטא",
    name: "Abaújszántó — kever of the Shemen Rokeach",
    yiddishName: "אבאוי סאנטא — ציון בעל שמן רוקח",
    country: "Hungary",
    address: "Jewish cemetery, Abaújszántó, Borsod-Abaúj-Zemplén, Hungary",
    airportRef: "48.267, 21.200",
    arrivalNotes: [
      "Abaújszántó is one of the ten stops on the Tokaj-Hegyalja route through the kevarim of the region, so almost nobody comes only here — Liska, Kerestir and Ijhel are on the same road and already have their own pages on this site.",
      "The community here dates from 1765, when Jews came from Austria, Bohemia and Moravia under the protection of Prince Bretzenheim.",
    ],
    burials: [
      {
        name: "Rabbi Elazar Löw",
        yiddishName: "רבי אלעזר לעװ",
        knownAs: "The Shemen Rokeach",
        seforim: "שמן רוקח",
        yahrzeit: "5597 / 1837",
        note: "1758–1837. Rov of Abaújszántó and one of the leading Hungarian poskim of his generation; he is known by the name of his sefer, as is usual.",
      },
    ],
    sourceUrl: "https://footstepsofwonderrabbis.com/en/tourism/item/the-abaujszanto-jewish-cemetery-61659",
  },
  {
    slug: "ciechanow-landau",
    city: "Ciechanów",
    yiddishCity: "ציעחאנוב",
    name: "Ciechanów — the Jewish cemetery",
    yiddishName: "ציעחאנוב — בית החיים",
    country: "Poland",
    address: "Jewish cemetery, Sienkiewicza, Ciechanów, Masovian Voivodeship, Poland",
    airportRef: "52.881, 20.610",
    arrivalNotes: [
      "THERE IS NO OHEL STANDING HERE. Come knowing that. The cemetery was destroyed during and after the war, and the ohel over the Ciechanover Rov was deliberately taken down — his remains were moved to the newer cemetery first, and then the ohel was demolished so that no trace was left.",
      "The newer ground was itself cleared and turned into a recreational area. It is a meadow with a few trees today, surrounded by blocks of flats, with no matzevos standing.",
      "The oldest burial ground, from about the seventeenth century, was near the corner of 17 Stycznia and Jesionowa. There is nothing marked to find there either.",
      "The Foundation for the Preservation of Jewish Heritage in Poland and Friends of Jewish Heritage in Poland have been raising money to put a monument back on the site. Ask them what stands there before you make the journey.",
    ],
    burials: [
      {
        name: "Rabbi Avraham Landau",
        yiddishName: "רבי אברהם לאנדא",
        knownAs: "The Ciechanover Rov",
        yahrzeit: "5635 / 1875",
        note: "Rov of Ciechanów from 1829 and one of the leading Polish rabbonim of his time. His kever was a place people travelled to before the war; his remains were reburied in the newer cemetery when the ohel was destroyed, and that ground is now open grass. Nothing marks the spot.",
      },
    ],
    sourceUrl: "https://www.jewishheritagepoland.org/ourlocations/ciechanow",
  },
];
