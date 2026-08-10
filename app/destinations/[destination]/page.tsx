import Link from "next/link";
import { cache, Suspense } from "react";
import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import KosherNearby from "@/components/KosherNearby";
import Navbar from "@/components/Navbar";
import DestinationStickyCta from "@/components/DestinationStickyCta";
import VerificationBadge from "@/components/VerificationBadge";
import StructuredData from "@/components/StructuredData";
import { destinations as heritageDestinations, destinationHref as heritageHref } from "@/data/destinations";
import { getVacationDestination } from "@/data/vacation-destinations";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";
import { fromHechsherState, fromKosherClaim, reconfirmBeforeTravel, TRUST_LEVELS } from "@/lib/trust-status";
import {
  addToTripHref,
  factsFor,
  kosherAvailability,
  shabbosPracticality,
  SIGNAL_CLASSES,
  type Signal,
  type VacationFacts,
} from "@/lib/vacation-ideas";
import { staySearchHref } from "@/lib/stay-search";
import { loadDestinationSources } from "@/lib/vacation-sources";
import { readBookingLink } from "@/lib/booking-access-store";
import { vacationDestinations, type VacationDestination } from "@/data/vacation-destinations";

/**
 * PRERENDERED, AND THIS IS THE FIX FOR THE THING PEOPLE ACTUALLY NOTICED.
 *
 * This page was `force-dynamic`. Opening /vacation-ideas/rome directly meant:
 * render nothing, show app/vacation-ideas/loading.tsx — "Loading vacation
 * destinations…" — and wait while three unfiltered reads of every attraction,
 * stay and quarter on the site came back, on every single view, for a page
 * whose heading and summary are in a file that has not changed since the build.
 *
 * The reason it was dynamic was real: an entry the owner adds in the admin has
 * to appear here without a deploy. That is what the cache TAG is for. It is
 * cleared the moment an entry is saved (app/admin/add/actions.ts), so the page
 * is rebuilt then rather than being refused a cache for ever.
 *
 * generateStaticParams builds every destination at deploy time, so a direct hit
 * is served from HTML with the H1, the summary and the practical sections
 * already in it. `revalidate` is the backstop for a change this process cannot
 * see: the owner adding a stay in Rome clears the tag and this page is rebuilt.
 *
 * `dynamicParams` is OFF because the destination list is a file in this repo —
 * a new destination arrives with a deploy and never between two of them. With
 * it on, an address that is not a destination was answered 200 with the loading
 * skeleton on it for ever: the notFound() below never reached the response,
 * because there is nothing to render it into once the shell has been served.
 * A wrong address should be a 404, and off is the only setting that gives one.
 */
export const revalidate = 900;
export const dynamicParams = false;

export function generateStaticParams() {
  return vacationDestinations.map((destination) => ({ destination: destination.slug }));
}

/**
 * Everything the practical sections need, read once per request.
 *
 * Four Suspense boundaries below all want the same facts. React's cache() makes
 * that one read: without it the boundaries would each start their own, and the
 * page would do the work four times to render it once.
 */
const factsOf = cache(async (destination: VacationDestination): Promise<VacationFacts> =>
  factsFor(destination, await loadDestinationSources(destination)),
);

export async function generateMetadata({ params }: { params: Promise<{ destination: string }> }) {
  const { destination: slug } = await params;
  const destination = getVacationDestination(slug);
  if (!destination) {
    return pageMetadata({
      title: "Destination not found — White Glove Itineraries",
      description: "This vacation destination is not on the site.",
      path: `/destinations/${slug}`,
      noIndex: true,
    });
  }
  return pageMetadata({
    title: `Kosher travel in ${destination.name} — what to know before you book | White Glove`,
    description: `${destination.whyGo} Kosher food, Shabbos, where to stay and what to do in ${destination.name}.`,
    path: `/destinations/${destination.slug}`,
  });
}

/**
 * One vacation destination.
 *
 * THE ORDER OF THE SECTIONS IS THE ORDER SOMEBODY DECIDES IN. Why go, when,
 * how long, who for — then, once they are still reading, the four practical
 * questions that decide whether a kosher family can actually do it: where to
 * sleep, what to eat, what Shabbos looks like, and how to get around.
 *
 * EVERY PRACTICAL SECTION IS BUILT FROM DATA THE SITE ALREADY HOLDS. Nothing
 * on this page asserts that a restaurant exists, that a hotel is kosher, or
 * that a shul has a minyan — each of those comes from a record with a source
 * and a status behind it, and where there is no record the section says so in
 * as many words. An empty section that admits it is empty is worth more than a
 * full one nobody can check, and it is the only version of this page that is
 * honest on the day it ships.
 *
 * The editorial half — why visit, best time, who it suits — is marked as
 * editorial where it appears, because it is a judgement and the four
 * verification labels do not apply to a judgement.
 */

function SignalPanel({ signal, children }: { signal: Signal<string>; children?: React.ReactNode }) {
  return (
    <div className={`rounded-xl border p-5 ${SIGNAL_CLASSES[signal.tone]}`}>
      <p className="flex items-center gap-2 text-sm font-bold">
        <span aria-hidden="true">{signal.glyph}</span>
        {signal.label}
      </p>
      <p className="mt-2 text-sm leading-6">{signal.detail}</p>
      {children}
    </div>
  );
}

function Section({
  id,
  title,
  children,
  lead,
}: {
  id: string;
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="wg-page-section scroll-mt-28 py-10">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-3 max-w-3xl text-lg leading-8 text-stone-600">{lead}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

/** The site's own kevarim guide for the same town, when there is one. */
function heritageGuideFor(destination: VacationDestination) {
  const names = new Set(destination.cities.map((city) => city.toLowerCase()));
  return heritageDestinations.find((entry) => names.has(entry.city.toLowerCase()) && entry.guide);
}

function StaysSection({ facts }: { facts: VacationFacts }) {
  // Nothing to show, so nothing is shown. A panel announcing that this part
  // is unfinished is a page about us; an absent section is a page about Rome.
  if (facts.stays.length === 0 && facts.areas.length === 0) return null;
  return (
    <div className="space-y-6">
      {facts.areas.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Which part of town</h3>
          <ul className="mt-3 space-y-3">
            {facts.areas.map((area) => (
              <li key={area.slug} className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
                <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                  {area.name}
                </p>
                <p className="mt-2 leading-7 text-stone-600">{area.note}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {facts.stays.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Places to stay</h3>
          <ul className="mt-3 grid gap-4 md:grid-cols-2">
            {facts.stays.map((stay) => {
              const claim = fromKosherClaim(stay.kosherClaim);
              return (
                <li key={stay.slug} className="wg-card border border-[var(--gold-light)] bg-[var(--surface)] p-5">
                  <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">{stay.kind}</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                    {stay.name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-stone-600">{stay.summary}</p>
                  {stay.season && (
                    <p className="mt-3 flex items-start gap-2 text-sm font-semibold text-amber-900">
                      <span aria-hidden="true">!</span>
                      <span>Seasonal — {stay.season}</span>
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {claim ? (
                      <VerificationBadge descriptor={claim} size="sm" />
                    ) : (
                      <span className="text-xs text-stone-500">Makes no kashrus claim — listed for where it stands.</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm">
            <Link
              href="/hotels"
              className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              Compare every place to stay on the site
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- the parts that need a read, and what stands in while they wait ------
 *
 * SHAPED LIKE WHAT IS COMING rather than a spinner, and announced rather than
 * merely drawn: a screen reader gets nothing from a grey rectangle, so the
 * status line is the real message and the blocks are hidden from the
 * accessibility tree. Only ever seen for a destination that was not in the
 * build — everything in data/vacation-destinations.ts is prerendered whole. */

function Skeleton({ what, rows = 2 }: { what: string; rows?: number }) {
  return (
    <div aria-busy="true">
      <p role="status" className="text-sm font-semibold text-[var(--navy)]">
        Loading {what}…
      </p>
      <div aria-hidden="true" className="mt-4 grid animate-pulse gap-4 md:grid-cols-2">
        {Array.from({ length: rows * 2 }, (_, index) => (
          <div key={index} className="h-28 rounded-xl border border-[var(--gold-light)] bg-[var(--cream-deep)]" />
        ))}
      </div>
    </div>
  );
}

/** A signal panel's own placeholder: the same box, without a claim in it. */
function SignalFallback({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-stone-300 bg-stone-50 p-5" aria-busy="true">
      <p role="status" className="text-sm font-bold text-stone-600">
        {label} — loading…
      </p>
    </div>
  );
}

async function KosherSignal({ destination }: { destination: VacationDestination }) {
  return <SignalPanel signal={kosherAvailability(destination, await factsOf(destination))} />;
}

async function ShabbosSignal({ destination }: { destination: VacationDestination }) {
  return <SignalPanel signal={shabbosPracticality(destination, await factsOf(destination))} />;
}

async function WhereToStay({ destination }: { destination: VacationDestination }) {
  return <StaysSection facts={await factsOf(destination)} />;
}

async function ThingsToDo({ destination }: { destination: VacationDestination }) {
  const facts = await factsOf(destination);
  if (facts.attractions.length === 0) return null;
  return (
    <>
      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {facts.attractions.map((attraction) => (
          <li key={attraction.slug} className="wg-card border border-[var(--gold-light)] bg-[var(--surface)] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
              {attraction.kind} · {attraction.city}
            </p>
            <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
              {attraction.name}
            </h3>
            <p className="mt-2 text-sm leading-6 text-stone-600">{attraction.summary}</p>
            {attraction.shabbos && (
              <p className="mt-3 border-t border-[var(--gold-light)] pt-3 text-sm leading-6 text-stone-600">
                <span className="font-semibold text-[var(--navy)]">On Shabbos: </span>
                {attraction.shabbos}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm">
        <Link
          href="/things-to-do"
          className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
        >
          Browse everything to do on the site
        </Link>
      </p>
    </>
  );
}

async function KosherFood({ destination }: { destination: VacationDestination }) {
  const facts = await factsOf(destination);
  // Where the live kosher lookup should be centred: the quarter's own
  // published coordinate, or failing that the anchor a stay is measured from.
  // Both are real positions for a shul or a street — never a guess at the
  // middle of a city, which would return the wrong half of it.
  const anchor = facts.areas[0]?.coordinates ?? facts.stays[0]?.anchor?.coordinates;
  return (
    <>
      <SignalPanel signal={kosherAvailability(destination, facts)} />

      {facts.eateries.length > 0 && (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {facts.eateries.map((eatery) => {
            const hechsher = fromHechsherState(eatery.hechsher.state);
            return (
              <li key={eatery.slug} className="wg-card border border-[var(--gold-light)] bg-[var(--surface)] p-5">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-stone-500">
                  {eatery.kind} · {eatery.diet}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">
                  {eatery.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-stone-600">{eatery.summary}</p>
                <div className="mt-3">
                  {hechsher ? (
                    <VerificationBadge descriptor={hechsher} size="sm" />
                  ) : (
                    <VerificationBadge descriptor={TRUST_LEVELS["being-checked"]} size="sm" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {facts.base && (facts.base.eateries.length > 0 || facts.base.areas.length > 0) && (
        <div className="mt-6 rounded-xl border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
          <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
            Where to shop on the way in
          </h3>
          <p className="mt-2 leading-7 text-stone-600">{facts.base.note}</p>
          <ul className="mt-3 space-y-2">
            {facts.base.eateries.map((eatery) => (
              <li key={eatery.slug} className="text-sm leading-6 text-stone-600">
                <span className="font-semibold text-[var(--navy)]">{eatery.name}</span> — {eatery.summary}
              </li>
            ))}
            {facts.base.areas.map((area) => (
              <li key={area.slug} className="text-sm leading-6 text-stone-600">
                <span className="font-semibold text-[var(--navy)]">{area.name}</span> — {area.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {anchor ? (
        <div className="mt-6 rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
          {/* Live, and deliberately not loaded until it is asked for: this
              reaches OpenStreetMap, and a page that fires that on every
              view is slow for everybody and rude to a free service. */}
          <KosherNearby
            coordinates={anchor}
            heading={`Kosher places tagged near ${destination.name}, live`}
            radiusKm={10}
            showAddToTrip
          />
          <p className="mt-3 text-xs leading-5 text-stone-500">
            This lookup is OpenStreetMap data, not our own checking — anybody can add to it. Treat it as a lead and
            confirm the hechsher yourself.
          </p>
        </div>
      ) : (
        <p className="mt-6 text-sm">
          <Link
            href="/kosher"
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Search live for kosher food anywhere
          </Link>
        </p>
      )}
    </>
  );
}

export default async function VacationDestinationPage({ params }: { params: Promise<{ destination: string }> }) {
  const { destination: slug } = await params;
  const destination = getVacationDestination(slug);
  if (!destination) notFound();

  // The only await the SHELL does. Everything below the heading that needs a
  // read is behind a Suspense boundary, so the H1, the summary and the
  // editorial sections are in the first byte of HTML either way.
  const booking = await readBookingLink();
  const heritage = heritageGuideFor(destination);

  const contents: Array<[string, string]> = [
    ["why-visit", "Why visit"],
    ["when-and-how-long", "When to go, and for how long"],
    ["where-to-stay", "Where to stay"],
    ["things-to-do", "Things to do"],
    ["kosher-food", "Kosher food"],
    ["shabbos", "Shabbos"],
    ["minyanim-and-mikvaos", "Minyanim and mikvaos"],
    ["getting-around", "Getting there and around"],
    ...(destination.outline ? ([["outline", "A shape for the days"]] as Array<[string, string]>) : []),
    ["cautions", "Before you book"],
  ];

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Destinations", path: "/destinations" },
          { name: destination.name, path: `/destinations/${destination.slug}` },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <nav aria-label="Breadcrumb" className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">
            <Link href="/destinations" className="underline decoration-[var(--gold)] underline-offset-4">
              Destinations
            </Link>
            <span aria-hidden="true" className="mx-2 text-stone-400">
              /
            </span>
            <span className="text-stone-600">{destination.country}</span>
          </nav>

          <h1 className="mt-5 font-[family-name:var(--font-display)] text-[clamp(2.5rem,7vw,4.25rem)] leading-[1.06] text-[var(--navy)]">
            {destination.name}
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">{destination.overview}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Ideal length</p>
              <p className="mt-1 font-semibold text-[var(--navy)]">{destination.suggestedLength}</p>
            </div>
            <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Best for</p>
              <p className="mt-1 font-semibold text-[var(--navy)]">{destination.bestFor.join(" · ")}</p>
            </div>
            <Suspense fallback={<SignalFallback label="Kosher food" />}>
              <KosherSignal destination={destination} />
            </Suspense>
            <Suspense fallback={<SignalFallback label="Shabbos" />}>
              <ShabbosSignal destination={destination} />
            </Suspense>
          </div>

          {/* THE OFFER THAT WENT: "Have us plan Rome", beside the first
              button, at the top of the most commercial page on the site. It
              made every section below it read as a sales funnel — the visitor
              stops reading the kosher notes and starts working out what the
              catch is. It is offered inside Contact, which is the only place
              it belongs. See lib/contact-reasons.ts. */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={staySearchHref({ destination: destination.name })}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              See places to stay in {destination.name}
            </Link>
            <Link
              href={addToTripHref(destination)}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Add {destination.name} to a trip
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <nav aria-label="On this page" className="border-b border-[var(--gold-light)] py-6">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">On this page</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            {contents.map(([id, label]) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold-light)] underline-offset-4 hover:decoration-[var(--gold)]"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <Section id="why-visit" title="Why visit">
          <ul className="glove-list max-w-3xl space-y-3 text-lg leading-8 text-stone-600">
            {destination.whyVisit.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-6 max-w-3xl rounded-lg border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-5 py-3 text-sm leading-6 text-stone-600">
            <span className="font-semibold text-[var(--navy)]">This part is our opinion,</span> not a checked fact —
            which is why it carries no verification label. The practical sections below do, and each of them comes from
            a record with a source behind it.
          </p>
        </Section>

        <Section id="when-and-how-long" title="When to go, and for how long">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Best time</h3>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-stone-600">{destination.bestTime}</p>
              <h3 className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Who it suits</h3>
              <p className="mt-2 max-w-2xl text-lg leading-8 text-stone-600">{destination.suits}</p>
            </div>
            <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stone-500">Give it</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">
                {destination.suggestedLength}
              </p>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                Seasons this works in: {destination.seasons.join(", ")}.
              </p>
            </div>
          </div>
        </Section>

        <Section
          id="where-to-stay"
          title="Where to stay"
          lead="Which part of town matters more than which hotel — that is the decision that makes Shabbos walkable or not."
        >
          <Suspense fallback={<Skeleton what={`where to stay in ${destination.name}`} />}>
            <WhereToStay destination={destination} />
          </Suspense>
        </Section>

        <Section id="things-to-do" title="Things to do">
          <Suspense fallback={<Skeleton what={`things to do in ${destination.name}`} rows={3} />}>
            <ThingsToDo destination={destination} />
          </Suspense>
        </Section>

        <Section
          id="kosher-food"
          title="Kosher food"
          lead="Kosher food here, and a live lookup for whatever has opened since."
        >
          <Suspense fallback={<Skeleton what={`kosher food in ${destination.name}`} />}>
            <KosherFood destination={destination} />
          </Suspense>
        </Section>

        <Section id="shabbos" title="Shabbos">
          <Suspense fallback={<SignalFallback label="Shabbos" />}>
            <ShabbosSignal destination={destination} />
          </Suspense>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <VerificationBadge descriptor={reconfirmBeforeTravel()} />
            <p className="max-w-2xl text-sm leading-6 text-stone-600">
              Candle-lighting times, whether a shul still has a regular minyan, and whether a seasonal kosher kitchen is
              running are all things that move. Confirm them for your dates.{" "}
              <Link
                href="/verification"
                className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                What the labels on this page mean
              </Link>
            </p>
          </div>
        </Section>

        <Section id="minyanim-and-mikvaos" title="Minyanim and mikvaos">
          {heritage ? (
            <div className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-5">
              <p className="leading-7 text-stone-600">
                {destination.name} also has a researched guide in the heritage section of this site, and the minyanim,
                mikvaos and local contacts we hold for it live there with their own verification labels.
              </p>
              <p className="mt-4">
                <Link
                  href={heritageHref(heritage)}
                  className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                >
                  Open the {heritage.city} guide for minyanim, mikvaos and contacts
                </Link>
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-6 text-stone-600">
                Minyan times, mikvah access and Shabbos arrangements are best confirmed locally. The provider directory
                holds contacts across the site, and the community in the quarter named above is usually the fastest
                answer.{" "}
                <Link
                  href="/directory"
                  className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
                >
                  Open the provider directory
                </Link>
                .
              </p>
            </>
          )}
        </Section>

        <Section id="getting-around" title="Getting there and around">
          <p className="max-w-3xl text-lg leading-8 text-stone-600">{destination.transport}</p>
          {/* The two searches this section is actually about, each on the
              page that runs it. The car link carries the destination, because
              a link that says the site knows where you are going and then
              asks again is worse than one that never claimed to. */}
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/cars?destination=${encodeURIComponent(destination.name)}`}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Car hire in {destination.name}
            </Link>
            <Link
              href="/flights"
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-5 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--cream-deep)]"
            >
              Search flights
            </Link>
          </div>
          {/* Resolved, never a typed `/book`: the owner can have that path
              behind an access code, and this is a public page. */}
          {booking.searchIsPublic && (
            <p className="mt-5 text-sm">
              <Link
                href={booking.href}
                className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
              >
                Everything in one search
              </Link>
            </p>
          )}
        </Section>

        {destination.outline && (
          <Section
            id="outline"
            title="A shape for the days"
            lead="An outline to adapt, not a booking. Nothing here is reserved and the order is yours to change."
          >
            <h3 className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">
              {destination.outline.title}
            </h3>
            <ol className="mt-5 max-w-3xl space-y-4">
              {destination.outline.days.map((day, index) => (
                <li key={day} className="flex gap-4 border-t border-[var(--gold-light)] pt-4">
                  <span className="mt-1 shrink-0 text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">
                    Day {index + 1}
                  </span>
                  <span className="leading-7 text-stone-600">{day}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6">
              <Link
                href={addToTripHref(destination)}
                className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
              >
                Start a trip from this outline
              </Link>
            </p>
          </Section>
        )}

        <Section id="cautions" title="Before you book">
          <ul className="max-w-3xl space-y-4">
            {destination.cautions.map((caution) => (
              <li key={caution} className="flex gap-3 rounded-lg border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-5 py-4">
                <GloveMark size="sm" className="mt-1" />
                <span className="leading-7 text-stone-700">{caution}</span>
              </li>
            ))}
          </ul>
        </Section>

        {/* Rides the bottom of the viewport while there is page left, then
            lets go — the last section and the footer are never underneath it.
            See components/DestinationStickyCta.tsx. */}
        <DestinationStickyCta destination={destination.name} />
      </div>

      <section className="border-t border-[var(--gold-light)] bg-[var(--cream-deep)] px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.3fr_.7fr] lg:items-center">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)] sm:text-4xl">
              Booking {destination.name}
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-stone-600">
              Rooms and prices come from our booking partners. The planner holds the trip day by day — the route, the
              driving times, and a printable copy for the car — and it is free.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={staySearchHref({ destination: destination.name })}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--navy)] bg-[var(--navy)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
            >
              See places to stay
            </Link>
            <Link
              href={addToTripHref(destination)}
              className="inline-flex min-h-11 items-center rounded-md border border-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)] transition hover:bg-[var(--surface)]"
            >
              Plan {destination.name} myself
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
