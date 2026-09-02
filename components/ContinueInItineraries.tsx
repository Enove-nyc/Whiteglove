import { HANDOFF_ACTION, HANDOFF_BODY, HANDOFF_HEADING, continueTripHref, shouldOfferHandoff } from "@/lib/itineraries-handoff";
import { currentBrand } from "@/lib/site-brand";

/**
 * The one place this site points at White Glove Itineraries.
 *
 * Shown under the planner, to somebody who has a trip — not on the home page,
 * not in the nav, not beside every listing. One invitation where it is
 * relevant is a hand-off; the same words in six places is an advertisement,
 * and the owner has already turned that down once for the gear shelf.
 *
 * NOTHING IS TRANSFERRED AND NOTHING IS PROMISED. The trip is already on the
 * other side under the same account, because both products read one store —
 * so this is a door, not a migration, and it says as much. It offers tools,
 * never a service: White Glove does not plan anybody's trip.
 *
 * Renders nothing on the itineraries brand, which is the rule that matters
 * most here — that product must never point back at this one.
 */
export default async function ContinueInItineraries({ hasTrip }: { hasTrip: boolean }) {
  const brand = await currentBrand();
  if (!shouldOfferHandoff({ brand, hasTrip })) return null;

  return (
    <section
      aria-labelledby="carry-on-itineraries"
      className="mt-12 border-t border-[var(--gold-light)] pt-8"
    >
      <h2 id="carry-on-itineraries" className="text-lg font-bold text-[var(--navy)]">
        {HANDOFF_HEADING}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">{HANDOFF_BODY}</p>
      <a
        href={continueTripHref()}
        className="mt-4 inline-flex min-h-11 items-center rounded-md border border-[var(--gold-light)] bg-white px-4 text-sm font-semibold text-[var(--navy)] transition-colors hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--gold)]"
      >
        {HANDOFF_ACTION}
      </a>
    </section>
  );
}
