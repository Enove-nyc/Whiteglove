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
  "app/api/account/inbound/route.ts",
  "app/api/account/itinerary/collaborators/route.ts",
  "app/api/account/itinerary/comments/route.ts",
  "app/api/account/itinerary/favorites/route.ts",
  "app/api/account/itinerary/route.ts",
  "app/api/account/itinerary/send/route.ts",
  "app/api/account/itinerary/share/route.ts",
  "app/api/account/itinerary/shared/route.ts",
  "app/api/account/itinerary/votes/route.ts",
  "app/api/account/packing/route.ts",
  "app/api/account/smart-import/route.ts",
  "app/api/account/trips/route.ts",
  "app/api/cron/trip-reminders/route.ts",
  "app/api/inbound/confirmation/route.ts",
  "app/api/itinerary/ai/route.ts",
  "app/api/itinerary/nearby/route.ts",
  "app/api/trip-file/[shareId]/route.ts",
  "app/command-center/page.tsx",
  "app/itinerary/page.tsx",
  "app/itinerary/print/layout.tsx",
  "app/itinerary/print/page.tsx",
  "app/packing/page.tsx",
  "components/DayProgress.tsx",
  "components/ItinerariesHome.tsx",
  "components/ItineraryBuilder.tsx",
  "components/ItineraryFooter.tsx",
  "components/ItineraryOptimizationPanel.tsx",
  "components/ItineraryTranslationPanel.tsx",
  "components/PackingListPanel.tsx",
  "components/SmartImportPanel.tsx",
  "components/TripActivityFeed.tsx",
  "components/TripAdvisories.tsx",
  "components/TripComments.tsx",
  "components/TripContextBar.tsx",
  "components/TripDocuments.tsx",
  "components/TripGroupTools.tsx",
  "components/TripProgressStrip.tsx",
  "components/TripSetupPanel.tsx",
  "components/TripStartFlow.tsx",
  "components/TripSwitcher.tsx",
  "components/TripUpdates.tsx",
  "components/companion/TripAppCode.tsx",
  "data/inbound-import.ts",
  "data/inbound-words.ts",
  "data/itinerary-optimization.ts",
  "data/itinerary-print.ts",
  "data/itinerary-translation.ts",
  "data/itinerary.ts",
  "data/packing-basics.ts",
  "data/packing-list.ts",
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
  "lib/itinerary-optimization-ai.ts",
  "lib/itinerary-translation-ai.ts",
  "lib/packing-ai.ts",
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
  "lib/trip-updates-data.ts",
  "lib/trip-updates.ts",
  "lib/trip-votes-store.ts",
  "lib/trip-zmanim.ts",
];

/**
 * Here only, and correctly so. Each needs a reason, because "it is only here"
 * with no reason is indistinguishable from the drift this file exists to catch.
 */
export const KOSHER_ONLY: Record<string, string> = {
  "data/packing-gear-match.ts":
    "Links a packing line to the travel-gear shelf. The shelf is a settled decision of THIS product with exactly two homes, and a general planner hanging affiliate links off a packing list is what the owner turned down. Deliberately not ported.",
  "lib/itineraries-handoff.ts":
    "The marketing link to the other product. One-directional by settled decision — porting it would have Itineraries pointing home at a kosher site.",
};

/**
 * BUILT HERE, OWED TO ITINERARIES. Each is trip-management work — build,
 * organise, manage — sitting on the discover-and-plan product because that is
 * where the session happened to be.
 *
 * Each is blocked on something real rather than forgotten, and the reason says
 * what. None was half-ported: a button that quietly saves nothing is worse
 * than an absent one. Two subsystems account for all five — the service
 * worker's second cache, and push notifications.
 */
export const OWED_TO_ITINERARIES: Record<string, string> = {
  "app/api/cron/trip-alerts/route.ts":
    "The nightly flight-status check that raises a trip's alerts. Needs the push-notification and alert-email subsystem, which is its own feature and not yet on that side.",
  "components/CommandCenterNotify.tsx":
    "Asks for permission to send those alerts to a phone. Blocked on the same push subsystem as the cron above.",
  "components/OfflineDocuments.tsx":
    "The control for the above. Blocked on the same service-worker merge — a button that quietly saves nothing is worse than an absent one.",
  "data/trip-reminders.ts":
    "Pipeline nudges (badly named — what needs the ADVISOR's attention, not a client reminder). Needs lib/needs-attention and a merge into a PipelineDashboard that has diverged there.",
  "lib/offline-documents.ts":
    "Documents kept on the phone — needs the other repository's service worker to hold a second cache, and the two have diverged by 193 lines. A surgical merge on live caching, not a copy.",
};

/** Every trip-shaped file, accounted for exactly once. */
export function accountedFor(): Set<string> {
  return new Set([...ON_BOTH, ...Object.keys(KOSHER_ONLY), ...Object.keys(OWED_TO_ITINERARIES)]);
}

/**
 * The filenames this rule watches. Deliberately about the NAME rather than the
 * contents: a file called trip-something is trip machinery whatever is inside
 * it, and a rule that read contents would argue with itself.
 *
 * IT MISSED components/OfflineDocuments.tsx ON THE FIRST DAY, which is the
 * best argument for the pattern being written out here rather than assumed.
 * The rule listed "offline-documents" and the component is spelled
 * OfflineDocuments, so a whole feature sat outside the guard. Word boundaries
 * in these names are written and unwritten in the same repository, so each
 * one is matched with the separator optional.
 */
export const TRIP_FILE = new RegExp(
  "(^|/)(" +
    ["trip", "itinerar(y|ies)", "packing", "inbound", "smart[-]?import", "command[-]?center", "offline[-]?documents", "day[-]?progress"].join("|") +
    ")",
  "i",
);
