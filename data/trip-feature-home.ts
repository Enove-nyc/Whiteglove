/**
 * WHICH PRODUCT EACH PIECE OF TRIP MACHINERY BELONGS TO.
 *
 * This exists because the same mistake kept happening: work gets done in
 * whichever repository the session opened, and Itineraries — the product whose
 * entire job is building, organising and managing a trip — ends up behind on
 * its own features. Forwarding a confirmation by email was built here first.
 * So were the packing list, itinerary optimisation, itinerary translation,
 * offline documents and trip updates.
 *
 * A NOTE IN AGENTS.MD IS A PROMISE; THIS IS A FAILING TEST. Every file in this
 * repository whose name says it is about a trip has to appear below, in one of
 * three lists. Add a new one without deciding which, and
 * tests/trip-feature-home.test.ts fails and says so. The decision is cheap
 * while the file is being written and expensive months later, which is exactly
 * the shape of failure this prevents.
 *
 * The lists are a record of what was decided, not a schedule, and nothing here
 * is a task for the owner.
 */

/** On both deployments. Nothing owed. */
export const ON_BOTH: readonly string[] = [
  "components/ItinerariesHome.tsx",
  "components/ItineraryBuilder.tsx",
  "components/ItineraryFooter.tsx",
  "components/TripAdvisories.tsx",
  "components/TripComments.tsx",
  "components/TripContextBar.tsx",
  "components/TripDocuments.tsx",
  "components/TripGroupTools.tsx",
  "components/TripProgressStrip.tsx",
  "components/TripSetupPanel.tsx",
  "components/TripStartFlow.tsx",
  "components/TripSwitcher.tsx",
  "components/companion/TripAppCode.tsx",
  "data/inbound-import.ts",
  "data/inbound-words.ts",
  "data/itinerary-print.ts",
  "data/itinerary.ts",
  "data/smart-import-files.ts",
  "data/smart-import.ts",
  "data/trip-activity.ts",
  "data/trip-addons.ts",
  "data/trip-alerts.ts",
  "data/trip-commission.ts",
  "data/trip-ideas.ts",
  "data/trip-parties.ts",
  "data/trip-payments.ts",
  "data/trip-pipeline.ts",
  "lib/command-center-data.ts",
  "lib/command-center.ts",
  "lib/day-progress.ts",
  "lib/inbound-import-store.ts",
  "lib/smart-import-parse.ts",
  "lib/smart-import.ts",
  "lib/trip-advisories.ts",
  "lib/trip-alerts.ts",
  "lib/trip-bar.ts",
  "lib/trip-collaboration.ts",
  "lib/trip-comment-store.ts",
  "lib/trip-comments.ts",
  "lib/trip-documents.ts",
  "lib/trip-favorites-store.ts",
  "lib/trip-pass-store.ts",
  "lib/trip-pass.ts",
  "lib/trip-plan.ts",
  "lib/trip-progress.ts",
  "lib/trip-reminders.ts",
  "lib/trip-roles.ts",
  "lib/trip-setup.ts",
  "lib/trip-templates-store.ts",
  "lib/trip-templates.ts",
  "lib/trip-travel-days.ts",
  "lib/trip-votes-store.ts",
  "lib/trip-zmanim.ts",
];

/**
 * Here only, and correctly so. Each needs a reason, because "it is only here"
 * with no reason is indistinguishable from the drift this file exists to catch.
 */
export const KOSHER_ONLY: Record<string, string> = {
  "lib/itineraries-handoff.ts":
    "The marketing link to the other product. One-directional by settled decision — porting it would have Itineraries pointing home at a kosher site.",
};

/**
 * BUILT HERE, OWED TO ITINERARIES. Each is trip-management work — build,
 * organise, manage — sitting on the discover-and-plan product because that is
 * where the session happened to be. Named by the feature it belongs to, so a
 * port takes a whole feature rather than a file.
 *
 * Emptying this list is the goal. Adding to it is not forbidden, but it has to
 * be deliberate: a name here is an admission, not a plan.
 */
export const OWED_TO_ITINERARIES: Record<string, string> = {
  "components/ItineraryOptimizationPanel.tsx": "Itinerary optimisation",
  "components/ItineraryTranslationPanel.tsx": "Itinerary translation",
  "components/PackingListPanel.tsx": "Packing list",
  "components/TripActivityFeed.tsx": "Trip activity feed",
  "components/TripUpdates.tsx": "Trip updates",
  "data/itinerary-optimization.ts": "Itinerary optimisation",
  "data/itinerary-translation.ts": "Itinerary translation",
  "data/packing-basics.ts": "Packing list",
  "data/packing-gear-match.ts": "Packing list",
  "data/packing-list.ts": "Packing list",
  "data/trip-reminders.ts": "Trip reminders",
  "lib/itinerary-optimization-ai.ts": "Itinerary optimisation",
  "lib/itinerary-translation-ai.ts": "Itinerary translation",
  "lib/offline-documents.ts": "Documents kept on the phone",
  "lib/packing-ai.ts": "Packing list",
  "lib/trip-updates-data.ts": "Trip updates",
  "lib/trip-updates.ts": "Trip updates",
};

/** Every trip-shaped file, accounted for exactly once. */
export function accountedFor(): Set<string> {
  return new Set([...ON_BOTH, ...Object.keys(KOSHER_ONLY), ...Object.keys(OWED_TO_ITINERARIES)]);
}

/**
 * The filenames this rule watches. Deliberately about the NAME rather than the
 * contents: a file called trip-something is trip machinery whatever is inside
 * it, and a rule that read contents would argue with itself.
 */
export const TRIP_FILE =
  /(^|\/)(trip|itinerary|itineraries|packing|inbound|smart-import|command-center|offline-documents|day-progress)/i;
