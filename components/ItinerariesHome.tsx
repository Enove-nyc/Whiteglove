import Image from "next/image";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import TravelSearch, { type TravelSearchPrefill, type TravelTab } from "@/components/TravelSearch";
import HomeStartItinerary from "@/components/HomeStartItinerary";
import { Icon, type IconName } from "@/components/icons/Icon";

/**
 * The White Glove Itineraries home page, laid out from the owner's own design
 * (AGENTS.md, 18 November 2026): book the trip, then build the itinerary.
 *
 * THE PHOTOGRAPH IS REAL AND CREDITED, never generated: "Bellagio, Lake Como,
 * Italy" by Ray in Manila, CC BY 2.0, from Wikimedia Commons. The licence asks
 * for the credit, so it is on the picture itself.
 */
const PHOTO_CREDIT = {
  title: "Bellagio, Lake Como, Italy",
  author: "Ray in Manila",
  licence: "CC BY 2.0",
  source: "https://commons.wikimedia.org/wiki/File:Bellagio,_Lake_Como,_Italy_(51180622244).jpg",
  licenceUrl: "https://creativecommons.org/licenses/by/2.0/",
};

const SAMPLE_LINES: Array<{ icon: IconName; text: string }> = [
  { icon: "plane", text: "Flight to Milan" },
  { icon: "bed", text: "Hotel in Bellagio" },
  { icon: "ticket", text: "Lake Como boat tour" },
];

export default function ItinerariesHome({
  initialTab,
  prefill,
}: {
  initialTab?: TravelTab;
  prefill?: TravelSearchPrefill;
} = {}) {
  return (
    <main className="wg-itineraries-home min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar brand="itineraries" />

      {/* ON A PHONE THE SEARCH COMES FIRST (owner, 19 November 2026: the
          booking should be on the first screen, "you should not have to
          scroll"). A short headline, then the search, then the photograph;
          on a wide screen it is the owner's layout, the photograph beside the
          headline and the search overlapping its foot. */}
      <section className="relative flex flex-col lg:block">
        <div className="contents lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <div className="order-1 px-5 pb-3 pt-3 sm:px-8 sm:pb-8 sm:pt-14 lg:order-none lg:pb-40 lg:pt-20">
            <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.7rem,5.4vw,4.1rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-[var(--navy-deep)]">
              Book the trip.
              <br />
              Build the itinerary.
            </h1>
            <p className="mt-5 hidden max-w-md text-lg leading-8 text-[#3D4766] sm:block sm:text-xl">
              Find flights, stays and more, then organise your whole trip in one place.
            </p>
          </div>
          <figure className="relative order-3 mt-6 h-56 sm:h-80 lg:absolute lg:inset-y-0 lg:right-0 lg:order-none lg:mt-0 lg:h-auto lg:w-[48%]">
            <Image
              src="/photos/home-lake-como.webp"
              alt="Bellagio's yellow lakeside villas on Lake Como, Italy"
              fill
              priority
              sizes="(min-width: 1024px) 48vw, 100vw"
              className="object-cover"
            />
            <figcaption className="absolute right-3 top-3 rounded bg-black/45 px-2 py-0.5 text-[11px] text-white/90">
              Photo:{" "}
              <a href={PHOTO_CREDIT.source} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                {PHOTO_CREDIT.title}
              </a>{" "}
              by {PHOTO_CREDIT.author},{" "}
              <a href={PHOTO_CREDIT.licenceUrl} className="underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                {PHOTO_CREDIT.licence}
              </a>
            </figcaption>
          </figure>
        </div>

        <div id="search" className="relative z-10 order-2 mx-auto w-full max-w-6xl scroll-mt-24 px-3 sm:px-6 lg:-mt-32">
          <TravelSearch key={initialTab ?? "flights"} initialTab={initialTab} prefill={prefill} />
          {/* After booking: the confirmation fills the trip in (Smart Import). */}
          <p className="mt-3 inline-block rounded-lg bg-white/90 px-3 py-1.5 text-sm leading-6 text-stone-700 lg:shadow-sm">
            <strong className="text-[var(--navy)]">Booked?</strong> Paste or forward the confirmation email into{" "}
            <Link href="/itinerary?import=1" className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">your itinerary</Link>
            {" "}and the flight or hotel is added for you.
          </p>
        </div>
      </section>

      {/* ASK THE AI, ON THE FRONT PAGE (owner, 20 November 2026: "why can I
          still not see the AI anywhere?"). A plain form: it opens /assistant
          with the question already asked, so this page stays static and cached. */}
      <section aria-labelledby="ask-ai-heading" className="mx-auto max-w-6xl px-3 pt-10 sm:px-6">
        <form action="/assistant" method="get" className="rounded-2xl border border-[#E6DCC8] bg-white p-4 shadow-[0_8px_26px_rgba(21,32,74,.06)] sm:p-6">
          <h2 id="ask-ai-heading" className="flex items-center gap-2 font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--navy-deep)]">
            <Icon name="sparkle" className="h-5 w-5 text-[var(--gold-ink)]" />
            Ask the AI travel assistant
          </h2>
          <p className="mt-1 text-sm text-stone-600">Where to stay, how to get around, what to do — ask anything about a trip.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor="ask-ai" className="sr-only">Your travel question</label>
            <input
              id="ask-ai"
              name="ask"
              required
              maxLength={500}
              placeholder="e.g. Best area to stay in Lisbon with children?"
              className="min-h-12 w-full min-w-0 rounded-lg border border-[#D9D2C4] bg-white px-3 text-[15px] outline-none focus:border-[var(--navy)] focus:ring-1 focus:ring-[var(--navy)]"
            />
            <button type="submit" className="min-h-12 shrink-0 rounded-lg bg-[var(--navy)] px-6 text-[15px] font-semibold text-white transition hover:bg-[var(--navy-deep)]">
              Ask
            </button>
          </div>
        </form>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_1px_minmax(0,1.1fr)] lg:items-center lg:gap-12">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-semibold leading-tight text-[var(--navy-deep)] sm:text-5xl">
              Start your itinerary
            </h2>
            <p className="mt-3 text-lg leading-7 text-[#3D4766]">Give your trip a name and add the details when you&rsquo;re ready.</p>
            <HomeStartItinerary />
          </div>

          <div aria-hidden="true" className="hidden h-full min-h-40 bg-[var(--gold)] lg:block" />

          <Link
            href="/sample-itinerary"
            className="group grid overflow-hidden rounded-2xl border border-[#E6DCC8] bg-white shadow-[0_8px_26px_rgba(21,32,74,.06)] transition hover:shadow-[0_14px_34px_rgba(21,32,74,.12)] sm:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]"
          >
            <span className="relative block h-48 sm:h-full sm:min-h-52">
              <Image
                src="/photos/home-lake-como-1200.webp"
                alt=""
                fill
                sizes="(min-width: 640px) 280px, 100vw"
                className="object-cover"
              />
            </span>
            <span className="block p-5 sm:p-6">
              <span className="block text-xs font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Sample itinerary</span>
              <span className="mt-2 block font-[family-name:var(--font-display)] text-2xl font-semibold leading-tight text-[var(--navy-deep)] sm:text-[1.75rem]">
                A week on Lake Como
              </span>
              <span className="mt-3 block divide-y divide-[#EDE6D8]">
                {SAMPLE_LINES.map((line) => (
                  <span key={line.text} className="flex items-center gap-3 py-2.5 text-[15px] text-[var(--ink)]">
                    <Icon name={line.icon} className="h-5 w-5 shrink-0 text-[var(--navy)]" />
                    {line.text}
                  </span>
                ))}
              </span>
              <span className="mt-3 inline-block text-sm font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4 group-hover:decoration-[var(--navy)]">
                See the whole week
              </span>
            </span>
          </Link>
          <p className="text-sm lg:col-start-3">
            <Link href="/sample-itineraries" className="font-semibold text-[var(--navy)] underline underline-offset-4">More sample itineraries</Link>
            <span className="text-stone-600"> — Rome, Paris, London and Barcelona, ready to copy into your planner.</span>
          </p>
        </div>
      </section>

      <Footer brand="itineraries" />
    </main>
  );
}
