/**
 * Getting a trip started in the planner.
 *
 * THE PLANNER IS EXCELLENT AND IT OPENS BADLY. Every control is there from the
 * first second — a trip name, two dates, a day-start time, travelers, flights
 * with connections, lodging, stops, saved routes, borders, documents, sharing
 * — and none of them says which to do first or what any of it is for. The
 * empty state is a form, and a form with eleven buttons is not an invitation.
 *
 * Nothing here changes what the planner can do. It adds the part in front of
 * it: what is done and what is next, somewhere real to start from, and an
 * honest sentence about where the trip is being kept.
 *
 * ALL PURE. The panel is components/TripSetupPanel.tsx; this is what "started"
 * means, what a template does to an itinerary, and how far along a trip is,
 * where it can be tested without a browser.
 */

import type { Itinerary, ItinActivity } from "@/data/itinerary";
import { travelersOf } from "@/data/itinerary";
import type { VacationDestination } from "@/data/vacation-destinations";
import { factsFor, type VacationSources } from "@/lib/vacation-ideas";

/* ---- what is done, and what is next -------------------------------------- */

export type SetupStep = {
  id: "dates" | "travelers" | "stay" | "stops" | "flights";
  label: string;
  done: boolean;
  /** What to do, for somebody who has not done it. */
  hint: string;
  /**
   * WHY it matters, which is the part the planner never said.
   *
   * "Add your dates" is an instruction. "Without dates nothing can be placed
   * on a day and the driving cannot be timed" is a reason, and a reason is
   * what makes somebody do it rather than skip it and wonder later why the
   * page looks empty.
   */
  why: string;
};

export function setupSteps(itin: Itinerary): SetupStep[] {
  return [
    {
      id: "dates",
      label: "Trip dates",
      done: Boolean(itin.startDate && itin.endDate),
      hint: "Set the day you leave and the day you come back.",
      why: "Everything else hangs off these. Without them nothing can be placed on a day, and the driving between stops cannot be timed.",
    },
    {
      id: "travelers",
      label: "Who is coming",
      done: travelersOf(itin).length > 0,
      hint: "Add the people travelling, and the children's ages.",
      why: "Ages change what a day can hold, and the printed copy needs the names.",
    },
    {
      id: "stay",
      label: "Somewhere to stay",
      done: itin.lodging.length > 0,
      hint: "Add the hotel or apartment, even if it is not booked yet.",
      why: "The planner measures each day from where you slept. Without it, a day's driving is measured from the last stop of the day before.",
    },
    {
      id: "stops",
      label: "Something to do",
      done: itin.activities.length > 0,
      hint: "Add the first place you want to be — a sight, a kever, a meal, anything.",
      why: "One stop is enough for the route planner to start ordering the days.",
    },
    {
      id: "flights",
      label: "Flights",
      done: itin.flights.length > 0,
      hint: "Add the flights when you have them, connections included.",
      why: "A red-eye or a long connection moves the first real day of the trip, and the planner needs to know that before it fills the day in.",
    },
  ];
}

export function setupProgress(steps: SetupStep[]): { done: number; total: number; percent: number; next: SetupStep | null } {
  const done = steps.filter((step) => step.done).length;
  return {
    done,
    total: steps.length,
    percent: Math.round((done / steps.length) * 100),
    next: steps.find((step) => !step.done) ?? null,
  };
}

/** Has anybody done anything to this trip yet? Decides whether to offer a template. */
export function tripIsUntouched(itin: Itinerary): boolean {
  return (
    !itin.startDate &&
    !itin.endDate &&
    itin.flights.length === 0 &&
    itin.lodging.length === 0 &&
    itin.activities.length === 0 &&
    !itin.notes?.trim() &&
    (itin.title === "" || itin.title === "My trip")
  );
}

/* ---- templates ----------------------------------------------------------- */

export type TemplateStop = {
  name: string;
  address?: string;
  coordinates?: string;
  notes?: string;
};

export type TripTemplate = {
  slug: string;
  /** "Four days without a car" */
  title: string;
  destination: string;
  country: string;
  /** How many days the outline covers. */
  days: number;
  /** The outline itself, one line per day. */
  outline: readonly string[];
  /**
   * Real places, from the site's own records, to drop into the trip
   * unscheduled.
   *
   * NOT INVENTED, and this is the whole reason a template here is worth having
   * rather than being a name and a paragraph: every stop is an attraction the
   * site already holds, with its real coordinate, so the route planner can
   * time the driving between them the moment they land in the trip.
   */
  stops: readonly TemplateStop[];
};

/**
 * The templates the planner can offer, built from the destinations that have
 * an outline written for them.
 *
 * A destination with no outline produces no template rather than a generic
 * one. "Three days in somewhere" helps nobody, and it would be the site
 * inventing a plan it has no basis for.
 */
export function templatesFrom(
  destinations: readonly VacationDestination[],
  sources: VacationSources,
  stopsPerTemplate = 6,
): TripTemplate[] {
  return destinations
    .filter((destination) => destination.outline)
    .map((destination) => {
      const facts = factsFor(destination, sources);
      return {
        slug: destination.slug,
        title: destination.outline!.title,
        destination: destination.name,
        country: destination.country,
        days: destination.outline!.days.length,
        outline: destination.outline!.days,
        stops: facts.attractions
          // A stop with no coordinate cannot be routed, and a stop the planner
          // cannot route is one more thing on a list rather than part of a day.
          .filter((attraction): attraction is typeof attraction & { coordinates: string } => Boolean(attraction.coordinates))
          .slice(0, stopsPerTemplate)
          .map((attraction) => ({
            name: attraction.name,
            coordinates: attraction.coordinates,
          })),
      };
    });
}

/** A date `days` after `from`, or "" when there is nothing to count from. */
export function datePlus(from: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) return "";
  const start = Date.parse(`${from}T00:00:00Z`);
  if (Number.isNaN(start)) return "";
  return new Date(start + days * 86_400_000).toISOString().slice(0, 10);
}

/**
 * A template applied to a trip.
 *
 * THREE RULES, each of them about not overwriting somebody's work:
 *
 *   • The title is only replaced if it is still the default. Somebody who has
 *     named their trip has said something, and a template is not entitled to
 *     rename it.
 *   • The end date is only filled in when there is a start date to count from
 *     and no end date yet. A template must never move a date somebody chose.
 *   • Stops are ADDED, unscheduled, and nothing existing is removed. A
 *     template is a starting point, not a reset.
 *
 * `uid` is passed in rather than generated here, because this file is pure and
 * a test needs the ids to be predictable.
 */
export function applyTemplate(itin: Itinerary, template: TripTemplate, uid: () => string): Itinerary {
  const named = itin.title && itin.title !== "My trip";
  const existing = new Set(itin.activities.map((activity) => activity.name.toLowerCase()));

  const added: ItinActivity[] = template.stops
    // Applying the same template twice should not double the list.
    .filter((stop) => !existing.has(stop.name.toLowerCase()))
    .map((stop) => ({
      id: uid(),
      name: stop.name,
      address: stop.address,
      coordinates: stop.coordinates,
      // Unscheduled on purpose: the traveler decides which day, or the route
      // planner does. Dropping six stops onto day one would be a plan nobody
      // asked for.
      date: "",
      notes: stop.notes,
    }));

  const outline = `${template.title} — ${template.destination}\n${template.outline
    .map((day, index) => `Day ${index + 1}: ${day}`)
    .join("\n")}`;

  return {
    ...itin,
    title: named ? itin.title : `${template.destination} trip`,
    endDate: itin.endDate || datePlus(itin.startDate, Math.max(0, template.days - 1)),
    activities: [...itin.activities, ...added],
    notes: [itin.notes?.trim(), outline].filter(Boolean).join("\n\n"),
  };
}

/* ---- what to suggest next ------------------------------------------------ */

/**
 * Which destination this trip looks like it is about, if any.
 *
 * Matched on the trip's own title and stops rather than asked for, so the
 * suggestion appears without another question. Returns null rather than
 * guessing — a suggestion for the wrong city is worse than none, because it
 * makes every other suggestion on the page less believable.
 */
export function destinationForTrip(
  itin: Itinerary,
  destinations: readonly VacationDestination[],
): VacationDestination | null {
  const haystack = [itin.title, ...itin.activities.map((a) => a.name), ...itin.lodging.map((l) => l.name)]
    .join(" ")
    .toLowerCase();
  if (!haystack.trim()) return null;
  return (
    destinations.find(
      (destination) =>
        haystack.includes(destination.name.toLowerCase()) ||
        destination.cities.some((city) => haystack.includes(city.toLowerCase())),
    ) ?? null
  );
}
