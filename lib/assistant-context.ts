/**
 * What page the traveler is standing on, when the site knows the place.
 *
 * THE QUESTION PEOPLE ACTUALLY ASK is "is there a mikvah here?" — on the Vienna
 * page, three lines below the word Vienna. The assistant was handed the words
 * and nothing else, so "here" meant nothing and the answer came back about
 * mikvaos in general or about nothing at all.
 *
 * THE PATH IS A KEY, NEVER A SENTENCE. The browser sends the address it is on;
 * this turns that into a subject ONLY by looking the slug up in the site's own
 * lists. An address that matches nothing resolves to nothing, and no part of
 * what the browser sent is ever passed on to the model. That is deliberate: a
 * page label built from client text would be a way to write into the prompt
 * from outside, and the assistant's whole guarantee is that it answers from
 * this site's pages.
 *
 * CONTEXT ADDS, IT NEVER NARROWS. The search that feeds the model runs on the
 * question as asked as well as on the question plus the place, and the two are
 * merged. Somebody on the Vienna page asking about Antwerp still gets Antwerp:
 * the page is a hint about what "here" means, not a filter on what may be
 * answered.
 *
 * Pure, and reads the site's own data — no store, no request, no model.
 */

import { cemeteries } from "@/data/cemeteries";
import { destinations } from "@/data/destinations";
import { vacationDestinations } from "@/data/vacation-destinations";

export type PageSubject = {
  /** "Vienna, Austria" — shown to the traveler, and given to the model. */
  label: string;
  /** The words to add to the search. Usually the town. */
  hint: string;
};

/** The first path segment and the second, or "". */
function parts(pathname: string): [string, string] {
  const clean = pathname.split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  return [segments[0] ?? "", segments[1] ?? ""];
}

/**
 * The place this page is about, or null.
 *
 * Only the pages that ARE about one place. A directory of every restaurant in
 * Europe is not about anywhere, and pretending it were about the first town on
 * it would be worse than having no context at all.
 */
export function subjectOfPath(pathname: string | null | undefined): PageSubject | null {
  if (!pathname) return null;
  const [section, slug] = parts(pathname);
  if (!slug) return null;

  if (section === "destinations") {
    const vacation = vacationDestinations.find((entry) => entry.slug === slug);
    if (vacation) return { label: `${vacation.name}, ${vacation.country}`, hint: vacation.name };
    const guide = destinations.find((entry) => entry.slug === slug);
    if (guide) return { label: `${guide.city}, ${guide.country}`, hint: guide.city };
    return null;
  }

  if (section === "cemeteries") {
    // /cemeteries/heritage/<slug> is a forwarding page with no details of its
    // own, so the town is still the subject when we hold that town.
    const wanted = slug === "heritage" ? parts(pathname.replace("/heritage", ""))[1] : slug;
    const cemetery = cemeteries.find((entry) => entry.slug === wanted);
    if (cemetery) return { label: `${cemetery.city}, ${cemetery.country}`, hint: cemetery.city };
    return null;
  }

  return null;
}

/** The search to run alongside the question as asked. Null when there is no place. */
export function contextualQuery(question: string, subject: PageSubject | null): string | null {
  if (!subject) return null;
  const asked = question.trim();
  if (!asked) return null;
  // Already naming the place: the plain search covers it, and running the same
  // words twice buys nothing.
  if (asked.toLocaleLowerCase("en").includes(subject.hint.toLocaleLowerCase("en"))) return null;
  return `${asked} ${subject.hint}`;
}

/** The line the model is told, or "". Built from our own data, never from the request. */
export function contextLine(subject: PageSubject | null): string {
  if (!subject) return "";
  return `The traveler is reading the White Glove page about ${subject.label}. If they say "here" or "there", they mean ${subject.label}.`;
}
