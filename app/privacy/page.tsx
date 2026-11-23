import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import AppPrivacyNotice from "@/components/AppPrivacyNotice";
import { resolvePage } from "@/lib/pages";
import { contactEmailFor } from "@/lib/site-words";
import { BRAND_DOMAIN, BRAND_NAME } from "@/lib/site-brand-core";
import { currentBrand } from "@/lib/site-brand";

// See app/terms/page.tsx for why this is rendered per request rather than
// prerendered: which brand this policy names depends on which domain a
// visitor is actually on, and a single static page cannot answer that.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const name = BRAND_NAME[await currentBrand()];
  return pageMetadata({
    title: `Privacy Policy — ${name}`,
    description: `How ${name} collects, uses, and protects your information.`,
    path: "/privacy",
  });
}

/**
 * The date this policy last changed in substance.
 *
 * IT IS NOT DECORATION. The policy itself promises, further down, to revise
 * this whenever it changes — and it did change in September, when the travel
 * preferences and AI assistant section was added, while this still read July.
 * A policy that misstates its own currency is the one claim on the page a
 * reader can check without taking anything on trust.
 *
 * tests/privacy-policy-current.test.ts fails if the preferences section is
 * present and this date predates it.
 */
const UPDATED = "November 19, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-stone-600">{children}</div>
    </section>
  );
}

export default async function PrivacyPolicyPage() {
  // The owner's published blocks once he has edited this page; the built-in
  // version — still wired to the site words for the contact email — until then.
  const page = await resolvePage("privacy");
  if (page?.edited) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <PageBlocks blocks={page.blocks} />
        <AppPrivacyNotice />
        <Footer />
      </main>
    );
  }
  const [words, brand] = await Promise.all([readWords(), currentBrand()]);
  const contactEmail = contactEmailFor(brand, words);
  const siteName = BRAND_NAME[brand];
  const siteDomain = BRAND_DOMAIN[brand];
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">{siteName}</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: {UPDATED}</p>
        </div>
      </section>

      <article className="wg-prose mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-[15px] leading-7 text-stone-600">
          {siteName} (&ldquo;we,&rdquo; &ldquo;us&rdquo;), operated by White Glove Travel, LLC, provides{" "}
          tools for planning and organising travel at{" "}
          {siteDomain}. This policy explains what information we collect, how we use it, and the choices you have.
        </p>

        <Section title="Information we collect">
          <p>We collect only what we need to run the service:</p>
          <ul className="glove-list space-y-2">
            <li><strong className="text-[var(--navy)]">Account details</strong> — if you have an account, your email address, your name if you give it, and a password. Passwords are stored only in a salted, hashed form; we never store or see your plain password.</li>
            <li><strong className="text-[var(--navy)]">Trips in your account</strong> — the itineraries you build while signed in: dates, flights, places to stay, plans, notes, travellers&rsquo; names you add, and any documents you attach, including the files you keep in a trip&rsquo;s travel wallet while logged in, which only you can open.</li>
            <li><strong className="text-[var(--navy)]">Trips built without an account</strong> — kept only in your own browser on that device. We do not receive or store them.</li>
            <li><strong className="text-[var(--navy)]">Trip codes and group conversations</strong> — when a trip is shared, the messages and display names in its group conversation, so everyone on the trip can read them (more below).</li>
            <li><strong className="text-[var(--navy)]">Usage counts</strong> — totals such as page visits and which booking searches are used. They are counts, not a record of what any one person did.</li>
            <li><strong className="text-[var(--navy)]">Cookies</strong> — a sign-in cookie that keeps you logged in, a cookie that remembers your chat identity on a trip, and, where enabled, a site-access cookie. We do not use advertising cookies ourselves; see &ldquo;Booking partners&rdquo; below.</li>
          </ul>
        </Section>

        <Section title="How we use your information">
          <ul className="glove-list space-y-2">
            <li>To sign you in, keep your account secure, and keep your trips available on your devices.</li>
            <li>To send account and trip emails, such as sign-in and password-reset codes and reminders about an upcoming trip.</li>
            <li>To run the trip app and its group conversations for the people you share a trip with.</li>
            <li>To understand which parts of the site are used, so we can improve it.</li>
          </ul>
          <p>We do not sell your personal information, and we do not use it for advertising.</p>
        </Section>

        <Section title="Booking partners">
          <p>When you search for flights, hotels, car rentals, activities, transfers, eSIMs or insurance, you are sent to an independent travel partner, which receives your search, such as places and dates, and handles any booking under its own privacy policy. Partner links and booking widgets on our pages may set the partner&rsquo;s own cookies so that a booking can be credited to us. We do not receive your payment details from partners.</p>
        </Section>

        <Section title="Service providers we share with">
          <p>We use a small number of providers to run the service, and share only what each needs to do its job:</p>
          <ul className="glove-list space-y-2">
            <li><strong className="text-[var(--navy)]">Hosting, storage and databases</strong> — the companies that host the website and store accounts, trips, attachments and messages on our behalf.</li>
            <li><strong className="text-[var(--navy)]">Email</strong> — to send account and trip emails, and to receive confirmations you forward to your trip.</li>
            <li><strong className="text-[var(--navy)]">Maps and address search</strong> — when you look up an address, what you type is sent from your browser to the mapping provider to suggest matches.</li>
            <li><strong className="text-[var(--navy)]">Itinerary support</strong> — if you choose to share a saved trip with support, a read-only copy of its schedule is available with a single-use code for up to one hour. Access is logged. The copy excludes notes, booking references, documents and chat.</li>
            <li><strong className="text-[var(--navy)]">Flight status</strong> — for flights you follow in a saved trip, the flight number and date are sent to a flight-data provider to check for changes.</li>
          </ul>
        </Section>

        <Section title="White Glove Kosher Travel">
          <p>White Glove Kosher Travel has closed. Accounts and trips from it are the same accounts and trips here, under this policy. If you left a rating or review, sent a correction or a photograph, or signed up for updates there, those records are kept but not used; you can ask us to delete them using the contact details below. The unsubscribe link in any earlier update email still works.</p>
        </Section>

        <Section title="How long we keep it">
          <p>We keep your account and its trips for as long as your account is open. Sign-in and reset codes expire automatically. Each trip&rsquo;s group conversation keeps its latest messages, as described below. You can ask us to delete your account and its data at any time.</p>
        </Section>

        {/* THE PREFERENCES AND THE ASSISTANT, because the product now does
            this and a policy that does not say so is out of date rather than
            brief. Kept to what a reader needs: what is saved, that they chose
            it, what it is used for, and how to see it or be rid of it. */}
        <Section title="Travel preferences and the AI assistant">
          <p>If you have an account, you can save travel preferences — the pace you like, your interests, kashrus and Shabbos requirements, where you prefer to stay, how you prefer to get about, and any access needs. You choose these on your account page; nothing is added to them from what you search for, open or ask.</p>
          <p className="mt-4">When you use the AI assistant while signed in, those saved preferences are sent with your question so the answer suits how you travel. Nothing else about you goes with it — not your name, your email, your trips, or anything you have asked before. Your account page shows the exact wording the assistant is given.</p>
          <p className="mt-4">Your preferences also fill in the planning questions so you are not asked them twice. Changing an answer while planning a trip applies to that trip and does not change what is saved.</p>
          <p className="mt-4">You can change any preference, or delete all of them, from your account page at any time. Deleting removes them from our records; it does not affect answers you have already been given. Separately, if you are signed in we keep a short list of the last few places you were reading about, so you can pick up where you left off on another device. That list holds at most eight places, clears itself after a fortnight, is never used for anything else, and has its own button to forget it.</p>
        </Section>

        <Section title="Security">
          <p>We protect your information with industry-standard measures: passwords are salted and hashed, sign-in sessions and account codes are cryptographically signed and time-limited, and traffic is served over encrypted connections. No online service can be perfectly secure, but we work to keep your information safe.</p>
        </Section>

        <Section title="Your choices">
          <p>You can review and change your trips and preferences from your account at any time. To access, correct, export or delete your personal information, email us and we will help. If you would rather not receive trip reminders, tell us and we will stop them; account and security emails are needed to use an account.</p>
        </Section>

        <Section title="Children">
          <p>{siteName} is intended for adults planning travel and is not directed to children. We do not knowingly collect information from children. Travellers&rsquo; names added to a trip by the adult planning it are kept only as part of that trip.</p>
        </Section>

        <Section title="Changes to this policy">
          <p>We may update this policy from time to time. When we do, we will revise the &ldquo;Last updated&rdquo; date above. Significant changes will be noted on this page.</p>
        </Section>

        <Section title="Contact us">
          <p>
            Questions about this policy or your information? Email{" "}
            <a href={`mailto:${contactEmail}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">{contactEmail}</a>.
          </p>
        </Section>
      </article>
      <AppPrivacyNotice />
      <Footer />
    </main>
  );
}
