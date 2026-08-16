import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import { SITE_DOMAIN, SITE_NAME } from "@/lib/features";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";

export const metadata = pageMetadata({
  title: "Terms of Use — White Glove Kosher Travel",
  description: "The terms that govern your use of White Glove Kosher Travel.",
  path: "/terms",
});

const UPDATED = "August 10, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight text-[var(--navy)]">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-7 text-stone-600">{children}</div>
    </section>
  );
}

export default async function TermsOfUsePage() {
  const { contactEmail, affiliateDisclosure } = await readWords();
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">White Glove Kosher Travel</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">Terms of Use</h1>
          <p className="mt-4 text-sm text-stone-500">Last updated: {UPDATED}</p>
        </div>
      </section>

      <article className="wg-prose mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="text-[15px] leading-7 text-stone-600">
          These Terms of Use govern your access to and use of {SITE_NAME} at {SITE_DOMAIN} (the &ldquo;Service&rdquo;).
          By using the Service, you agree to these terms. If you do not agree, please do not use the Service.
        </p>

        <Section title="The Service">
          <p>White Glove provides informational travel guides and planning tools for kosher travel and Jewish heritage journeys, including destination guides, cemetery and access information, saved routes, and flight and hotel search. The Service is provided for personal, non-commercial use.</p>
        </Section>

        <Section title="Your account">
          <p>Some features require an account. You agree to provide accurate information, to keep your password confidential, and to be responsible for activity that happens under your account. Notify us promptly if you believe your account has been used without your permission.</p>
        </Section>

        <Section title="Acceptable use">
          <p>You agree not to misuse the Service. In particular, you will not:</p>
          <ul className="glove-list space-y-2">
            <li>use the Service for any unlawful purpose or in violation of these terms;</li>
            <li>attempt to access accounts, data, or systems that are not yours;</li>
            <li>scrape, copy, or redistribute our content in bulk without permission;</li>
            <li>interfere with or disrupt the Service or the networks it relies on.</li>
          </ul>
        </Section>

        <Section title="Travel information — please verify">
          <p>
            Our guides gather details such as addresses, contacts, minyan and mikvah times, access notes, and safety notices to help
            your planning. This information can change, and access and travel conditions vary. <strong className="text-[var(--navy)]">Please
            confirm anything critical — access arrangements, hours, and current safety conditions — directly with the relevant contact
            or authority before you rely on it.</strong> White Glove is not responsible for outdated details or for the acts of third
            parties such as hotels, drivers, or cemetery custodians.
          </p>
        </Section>

        <Section title="Bookings and third-party services">
          <p>Flight and hotel searches and any bookings are provided through third-party travel partners and are subject to those partners&rsquo; own terms, pricing, and cancellation policies. White Glove is not the seller of those travel services and is not a party to your booking.</p>
          <p>
            <strong className="text-[var(--navy)]">How this site is paid.</strong> {affiliateDisclosure}
          </p>
        </Section>

        <Section title="Intellectual property">
          <p>The Service, including its guides, text, design, and logo, is owned by White Glove Kosher Travel and protected by applicable laws. We grant you a personal, limited, non-transferable right to use the Service for your own travel planning. All other rights are reserved.</p>
        </Section>

        <Section title="Disclaimer">
          <p>The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without warranties of any kind, whether express or implied, including accuracy, fitness for a particular purpose, or uninterrupted availability. Your use of the Service and reliance on its information is at your own discretion and risk.</p>
        </Section>

        <Section title="Limitation of liability">
          <p>To the fullest extent permitted by law, White Glove Kosher Travel will not be liable for any indirect, incidental, or consequential damages, or for any loss arising from your use of the Service, third-party travel services, or reliance on information provided through the Service.</p>
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
