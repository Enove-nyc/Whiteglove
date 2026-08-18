// The questions a town guide already answers, written out so they can be read
// — by somebody skimming the page, and by a search engine.
//
// WHY DERIVED AND NOT WRITTEN. Fourteen towns is fourteen sets of questions to
// keep true, and the moment a grave address or an access note is corrected in
// the admin, hand-written questions underneath it start lying. Every answer
// here is assembled from the fields the page is already rendering, so a
// correction upstream corrects the questions too, and a town missing the field
// simply does not get that question rather than getting a vague one.
//
// LATIN SCRIPT ONLY, deliberately. These strings are rendered as plain
// paragraphs and handed to schema.org FAQPage as the same text, so there is
// nowhere to hang a `lang` attribute on a Hebrew fragment inside one. It also
// happens to be what people type: somebody searching in English types "19
// Iyar", not the Hebrew date, and the Hebrew is on the page already in the
// panel above.

import type { CityGuide } from "@/data/destinations-detailed";
import type { Burial, Cemetery } from "@/data/cemeteries";
import type { NearbyAirport } from "@/components/DestinationActions";

export type TownQuestion = { question: string; answer: string };

/**
 * Everybody in this ground except the tzaddik the town is known for.
 *
 * The two records name the same man differently — the guide says "Rabbi
 * Elimelech Weisblum of Lizhensk" and the beis hachaim listing says "Rabbi
 * Elimelech Weisblum" — so an equality check let the headline name through
 * and Lizhensk listed Reb Elimelech among the people buried beside himself.
 * One name containing the other is the same man.
 *
 * Exported because the page renders this list and the questions describe it;
 * two copies of the rule is how they drift.
 */
export function otherBurials(guide: CityGuide, cemetery: Cemetery | undefined) {
  const headline = guide.tzaddik.toLowerCase();
  const isHeadline = (name: string) => {
    const value = name.toLowerCase();
    return value === headline || headline.startsWith(value) || value.startsWith(headline);
  };
  return [...(guide.alsoBuried ?? []), ...(cemetery?.burials ?? [])]
    .filter((burial) => !isHeadline(burial.name))
    .filter((burial, index, all) => all.findIndex((other) => other.name === burial.name) === index);
}

const GEMATRIA: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
};

/**
 * Hebrew month names as an English reader spells them.
 *
 * Longest first, because "אדר א" has to be tried before "אדר" or a leap-year
 * date silently loses which Adar it means.
 */
const MONTHS: Array<[RegExp, string]> = [
  [/מרחשון/, "Marcheshvan"],
  [/אדר\s*א[׳']?/, "Adar I"],
  [/אדר\s*ב[׳']?/, "Adar II"],
  [/תשרי/, "Tishrei"],
  [/חשון/, "Cheshvan"],
  [/כסלו/, "Kislev"],
  [/טבת/, "Teves"],
  [/שבט/, "Shevat"],
  [/אדר/, "Adar"],
  [/ניסן/, "Nissan"],
  [/אייר/, "Iyar"],
  [/סיון/, "Sivan"],
  [/תמוז/, "Tammuz"],
  [/אלול/, "Elul"],
  // Last, because the two letters of אב occur inside other words above.
  [/\bאב\b|^אב$/, "Av"],
];

/**
 * "כ״א אדר" → "21 Adar".
 *
 * Returns null rather than a half-reading when either half is unrecognisable,
 * because a question that says "on Adar" is worse than no question. Anything
 * after a separator — most listings append "· 5547 / 1787" — is the year, and
 * is handled by gregorianYear() instead.
 */
export function readHebrewDate(value: string | undefined): string | null {
  const head = (value ?? "").split("·")[0]?.trim();
  if (!head) return null;
  const month = MONTHS.find(([pattern]) => pattern.test(head))?.[1];
  if (!month) return null;
  const dayText = head.replace(MONTHS.find(([pattern]) => pattern.test(head))![0], "").replace(/[״"׳']/g, "").trim();
  const day = [...dayText].reduce((total, letter) => total + (GEMATRIA[letter] ?? 0), 0);
  if (!day || day > 30) return null;
  return `${day} ${month}`;
}

/** The civil year out of "תקמ״ז / 1787" or "1813". */
export function gregorianYear(value: string | undefined): string | null {
  return (value ?? "").match(/\b(1[0-9]{3}|20[0-9]{2})\b/)?.[1] ?? null;
}

function sentence(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * The questions a DIRECTORY town can answer.
 *
 * The hundred and nine towns in the directory have no researched guide behind
 * them — no named tzaddik, no yahrzeit, no overview — only a beis hachaim
 * listing with the kevarim in it. That is still enough to answer the two
 * questions people type most: where the kevarim are, and who is buried there.
 *
 * Deliberately not the same questions as a guided town. Asking "when is the
 * yahrzeit of X" needs a tzaddik the page has singled out, and a directory
 * town has not singled out anybody — several of these grounds hold four or
 * five kevarim of equal standing.
 */
export function directoryTownQuestions(input: {
  city: string;
  country: string;
  aliases?: string[];
  cemeteries: Array<{ name: string; address?: string; burials: Burial[] }>;
  airports: NearbyAirport[];
}): TownQuestion[] {
  const questions: TownQuestion[] = [];
  const aliases = (input.aliases ?? []).filter((alias) => /^[\x20-\x7eÀ-ɏ]+$/.test(alias));
  const withAddress = input.cemeteries.filter((cemetery) => cemetery.address);

  if (withAddress.length) {
    questions.push({
      question:
        withAddress.length === 1
          ? `Where is the beis hachaim in ${input.city}?`
          : `Where are the batei hachaim in ${input.city}?`,
      answer: sentence([
        withAddress.map((cemetery) => `${cemetery.name} — ${cemetery.address}`).join(". ") + ".",
        aliases.length ? `${input.city} is also searched as ${aliases.join(", ")}.` : null,
      ]),
    });
  }

  const burials = input.cemeteries
    .flatMap((cemetery) => cemetery.burials)
    .filter((burial, index, all) => all.findIndex((other) => other.name === burial.name) === index);
  if (burials.length) {
    const names = [...new Set(burials.map((burial) => burial.name))];
    questions.push({
      question: `Who is buried in ${input.city}?`,
      answer: `The listing for this beis hachaim records ${names.slice(0, 6).join(", ")}${names.length > 6 ? ` and ${names.length - 6} more` : ""}.`,
    });
  }

  questions.push(...airportQuestion(input.city, input.airports));
  return questions;
}

/**
 * The closest-airport question, shared by both kinds of town page.
 *
 * ONLY WHEN THE DISTANCES ARE REAL. airportsFor() falls back to a country's
 * main airports when a town has no coordinates, and those come back with no
 * `km`. That fallback is right under a heading that says so; it is a false
 * statement under the word "closest" — Kraków is not the nearest airport to
 * Lelov because nothing measured it.
 */
function airportQuestion(city: string, airports: NearbyAirport[]): TownQuestion[] {
  const measured = airports.filter((airport) => airport.km);
  if (measured.length !== airports.length || measured.length === 0) return [];
  const [closest] = measured;
  return [
    {
      question: `Which airport is closest to ${city}?`,
      answer: sentence([
        `${closest.name} (${closest.code}), about ${closest.km} away in a straight line.`,
        measured.length > 1
          ? `The other airports within reach are ${measured.slice(1).map((airport) => `${airport.name} (${airport.code})`).join(" and ")}.`
          : null,
        "There is no direct flight to the town itself, so the last leg is by road whichever airport you use.",
      ]),
    },
  ];
}

/**
 * The questions this town can answer truthfully, in the order they are asked.
 *
 * A question is included only when the field behind it exists. Nothing here
 * hedges: if the page does not know where the kever is, it does not ask.
 */
export function townQuestions(
  guide: CityGuide,
  cemetery: Cemetery | undefined,
  airports: NearbyAirport[],
): TownQuestion[] {
  const questions: TownQuestion[] = [];
  const where = guide.graveAddress ?? cemetery?.address;

  const aliases = (guide.aliases ?? []).filter((alias) => /^[\x20-\x7eÀ-ɏ]+$/.test(alias));

  if (where) {
    questions.push({
      question: `Where is the kever of ${guide.tzaddik}?`,
      answer: sentence([
        `At ${where}.`,
        cemetery ? `It is in the ${cemetery.name}.` : null,
        // "Searched as" and not "written": several guides list a sefer or a
        // rebbe's name among the aliases — Liska carries "Reb Hershele
        // Lisker", Lizhensk "Noam Elimelech" — and those are things people
        // type looking for the town, not spellings of it. Hebrew-script
        // aliases are dropped because this string is rendered as one
        // paragraph with nowhere to mark the language.
        aliases.length ? `${guide.city} is also searched as ${aliases.join(", ")}.` : null,
      ]),
    });
  }

  const yahrzeit = readHebrewDate(guide.yahrzeit);
  const year = gregorianYear(guide.niftar);
  if (yahrzeit) {
    questions.push({
      question: `When is the yahrzeit of ${guide.tzaddik}?`,
      answer: sentence([`${yahrzeit}.`, year ? `He was niftar in ${year}.` : null]),
    });
  }

  questions.push(...airportQuestion(guide.city, airports));

  const alsoBuried = otherBurials(guide, cemetery);
  if (alsoBuried.length) {
    // `name` and not `knownAs`: the epithet is what the panel above shows, but
    // in a sentence it is a fragment — Uman's entry reads "More than twenty
    // thousand murdered in 1768", which is a description of the kedoshim and
    // not a name you can list after a comma.
    const names = [...new Set(alsoBuried.map((burial) => burial.name))];
    questions.push({
      question: `Who else is buried in ${guide.city}?`,
      answer: `Alongside ${guide.tzaddik}, the listing for this beis hachaim records ${names.slice(0, 6).join(", ")}${names.length > 6 ? ` and ${names.length - 6} more` : ""}.`,
    });
  }

  if (guide.safetyNote) {
    questions.push({ question: `Is it safe to travel to ${guide.city}?`, answer: guide.safetyNote });
  }

  return questions;
}
