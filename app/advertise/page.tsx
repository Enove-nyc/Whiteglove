import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { PREMIUM_PLACEMENTS, placementLabel } from "@/lib/ad-placements";
import { pageMetadata } from "@/lib/seo";
import { readWords } from "@/lib/site-words-store";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Advertise with White Glove Itineraries",
  description:
    "A labelled position on White Glove Itineraries. Enquire about a destination page, Where to stay, Things to do, or the seasonal section on the home page.",
  path: "/advertise",
});

/**
 * Advertising, as a page a business can find.
 *
 * THE FOOTER USED TO SEND THEM TO A CONTACT REASON and nowhere that said what
 * they would be buying. This page names the placements, says every one is
 * labelled, and uses the same enquiry form Contact already asks — so a
 * submission is stored first and emailed second, the same as every other
 * message on the site.
 *
 * NO TRAFFIC FIGURE, NO RATE CARD. Both would be invented or rounded. The
 * form is the conversion; a number we do not have is not a substitute for it.
 */
export default async function AdvertisePage() {
  const words = await readWords();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Advertise with us</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
            A labelled position, on the page a traveller is already reading.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
            White Glove is used to choose a kosher-friendly holiday and to book it. A placement here sits next to that
            research — one per page, always marked as paid. It does not change a verification label, a kashrus claim, or
            the order of anything we checked ourselves.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Where a placement can sit</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Each one is empty until it is booked. The label a visitor sees is in the right-hand column — never omitted.
        </p>
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {PREMIUM_PLACEMENTS.map((spot) => (
            <li key={spot.value} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-5">
              <p className="font-[family-name:var(--font-display)] text-xl leading-tight text-[var(--navy)]">{spot.label}</p>
              <p className="mt-2 text-sm leading-6 text-stone-600">{spot.detail}</p>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--gold-ink)]">
                Shown as {placementLabel(spot.value)}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl text-sm leading-6 text-stone-500">
          Site-wide banners and popups are reserved for White Glove&apos;s own notices. A paid position is a card on a
          page, labelled, not a takeover.
        </p>
      </section>

      <section className="border-t border-[var(--gold-light)] bg-[var(--surface)] px-5 py-14 sm:px-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Ask about a placement</h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Say the business, where it operates, and which page you have in mind. {words.replyPromise}
          </p>
          <div className="mt-8">
            <ContactForm reason="advertise" words={words} />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
