import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { resolvePage } from "@/lib/pages";
import { contactEmailFor } from "@/lib/site-words";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/site-brand-core";
import { currentBrand } from "@/lib/site-brand";

// A LEGAL DOCUMENT, NOT JUST A TITLE. This page named a business by whichever
// domain a visitor was actually on used to be true only of the tab title;
// the body below named the kosher brand outright regardless. A policy that
// names the wrong company is not a small typo — it is the document a
// visitor reads to find out who they are agreeing with. Prerendering a
// single static page cannot answer "which brand asked", so this page is
// rendered per request instead.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const brand = await currentBrand();
  const name = BRAND_NAME[brand];
  return pageMetadata({
    title: `Terms of Use — ${name}`,
    description: `The terms that govern your use of ${name}.`,
    path: "/terms",
  });
}

const UPDATED = "November 19, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-stone-600">{children}</div>
    </section>
  );
}

export default async function TermsOfUsePage() {
  // Once the owner has published an edit in /admin/pages, the page is his
  // blocks. Until then it is the built-in version below, still wired to the
  // site words for the contact email and the affiliate disclosure.
  const page = await resolvePage("terms");
  if (page?.edited) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <PageBlocks blocks={page.blocks} />
        <Footer />
      </main>
    );
  }
  const [words, brand] = await Promise.all([readWords(), currentBrand()]);
  const { affiliateDisclosure } = words;
  const contactEmail = contactEmailFor(brand, words);
  const siteName = BRAND_NAME[brand];
  const siteDomain = BRAND_DOMAIN[brand];
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">{siteName}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Terms of Use</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: {UPDATED}</p>
        </div>
      </section>

      <article className="wg-prose mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-[15px] leading-7 text-stone-600">
          {siteName} at {siteDomain} (the &ldquo;Service&rdquo;) is operated by White Glove Travel, LLC, doing business as{" "}
          {siteName}. These Terms of Use govern your access to and use of the Service. By using the Service, you agree
          to these terms. If you do not agree, please do not use the Service.
        </p>

        <Section title="The Service">
          <p>
            {siteName} provides tools for organising travel: an itinerary planner for building a trip day by day,
            search links to booking partners for flights, hotels, car rentals, activities, transfers, eSIMs and travel
            insurance, and a trip app that opens a shared itinerary from its trip code. The Service is provided for
            your personal travel planning.
          </p>
          <p>
            You can use the itinerary planner without an account. A trip built without one is kept only in your own
            browser on that device; we do not receive or store it, and clearing your browser data removes it.
          </p>
          <p>
            White Glove Kosher Travel has closed. If you had an account there, the same account, with the same email
            and password, works here, and these terms now apply to it.
          </p>
        </Section>

        <Section title="Your account">
          <p>Accounts are opened by invitation. If you have one, you agree to keep your sign-in details confidential and you are responsible for activity under your account. Tell us promptly if you believe someone else has used it.</p>
        </Section>

        <Section title="Trip codes and group conversations">
          <p>A trip code opens one shared itinerary, and its group conversation where the trip has one. Anyone who has the code can open that trip, so share it only with the people travelling and keep it private. The person who shared a trip can withdraw its code at any time.</p>
          <p>You are responsible for what you post in a group conversation. Display names are chosen by each traveller and are not verified. Do not post anything unlawful, abusive, or that you do not have the right to share, and do not post anyone else&rsquo;s personal or payment details.</p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to misuse the Service. In particular, you will not:</p>
          <ul className="glove-list space-y-2">
            <li>use the Service for any unlawful purpose or in violation of these terms;</li>
            <li>try to open accounts, trips, codes, data or systems that are not yours;</li>
            <li>copy, scrape or redistribute the Service or its content in bulk without permission;</li>
            <li>interfere with or disrupt the Service or the networks it relies on.</li>
          </ul>
        </Section>

        <Section title="Travel information">
          <p>
            An itinerary gathers details such as addresses, opening hours, flight times, transfer times and travel
            notices. These change, and travel conditions vary.{" "}
            <strong className="text-[var(--navy)]">
              Confirm anything that matters — bookings, times, entry requirements and current conditions — directly
              with the airline, hotel, operator or relevant authority before you rely on it.
            </strong>{" "}
            {siteName} is not responsible for outdated details or for the acts of third parties such as airlines,
            hotels, drivers or tour operators.
          </p>
        </Section>

        <Section title="Bookings and booking partners">
          <p>Searches and bookings for flights, hotels, car rentals, activities, transfers, eSIMs and insurance are made with independent travel partners. Each booking is between you and that partner and is subject to its own terms, prices and cancellation rules. {siteName} does not sell those travel services and is not a party to your booking; questions about a booking go to the partner you booked with.</p>
          <p>
            <strong className="text-[var(--navy)]">How this site is paid.</strong> {affiliateDisclosure}
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>The Service, including its text, design and logo, is owned by {siteName} and protected by applicable laws. We grant you a personal, limited, non-transferable right to use it for your own travel planning. The trips you build and the messages you write remain yours; you give us permission to store and show them only so the Service can work for you and the people you share them with. All other rights are reserved.</p>
        </Section>

        <Section title="Disclaimer">
          <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, whether express or implied, including accuracy, fitness for a particular purpose, or uninterrupted availability. Keep your own copy of anything you cannot travel without, such as tickets and confirmations. Your use of the Service and reliance on its information is at your own discretion and risk.</p>
        </Section>

        <Section title="Limitation of liability">
          <p>To the fullest extent permitted by law, {siteName} will not be liable for any indirect, incidental, or consequential damages, or for any loss arising from your use of the Service, third-party travel services, or reliance on information provided through the Service.</p>
        </Section>

        <Section title="Changes">
          <p>We may update the Service and these terms from time to time. When we change these terms, we will revise the &ldquo;Last updated&rdquo; date above. Continued use of the Service after changes means you accept the updated terms.</p>
        </Section>

        <Section title="Governing law">
          <p>These terms are governed by the laws of the State of New York, without regard to its conflict-of-laws rules.</p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about these terms? Email{" "}
            <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">{contactEmail}</a>.
          </p>
        </Section>
      </article>
      <Footer />
    </main>
  );
}
