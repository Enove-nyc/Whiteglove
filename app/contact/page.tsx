import Link from "next/link";
import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { readReasonForBrand, reasonsForBrand } from "@/lib/contact-reasons";
import { resolvePage } from "@/lib/pages";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";
import { contactEmailFor } from "@/lib/site-words";

export async function generateMetadata() {
  const [page, name] = await Promise.all([resolvePage("contact"), currentBrand().then((b) => BRAND_NAME[b])]);
  // The owner writes the title and description in the admin; the
  // canonical URL and the share card come from the page it is.
  //
  // ONLY WHEN HE HAS ACTUALLY EDITED IT. resolvePage hands back the built-in
  // page when he has not, and the built-in title names White Glove Kosher
  // Travel — so reading it unconditionally put the other brand's name in the
  // tab, the search result and the link preview of every page on this site.
  const edited = page?.edited ? page : null;
  const errands =
    name === BRAND_NAME.itineraries
      ? "Tell us something on the site is broken, or ask a question."
      : "Tell us something on the site is wrong, ask about advertising, or ask a question.";
  return pageMetadata({
    title: edited?.seoTitle ?? `Contact — ${name}`,
    description: edited?.seoDescription ?? errands,
    path: "/contact",
  });
}

/**
 * One contact page, for every errand (owner, 19 November 2026: "merge contact
 * and support into one nice clear contact page").
 *
 * IT OPENS ON THE FORM, with help already chosen. "Contact" and "Support" used
 * to be two footer links to this same page, one of which made the visitor pick
 * a reason before any form appeared. Now there is one door: the most common
 * errand is ready to type into, and the others are one tap away above it.
 *
 * THE REASONS ARE STILL LINKS, NOT A JAVASCRIPT TOGGLE, so /contact?reason=fault
 * can be linked to, survives a refresh and works with scripts blocked. Each
 * still asks only its own questions (lib/contact-reasons.ts).
 */
export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; from?: string }>;
}) {
  const { reason: reasonParam } = await searchParams;
  const [page, words, brand] = await Promise.all([resolvePage("contact"), readWords(), currentBrand()]);
  const reasons = reasonsForBrand(brand);
  // Help is the open door; a link may name another reason this site offers.
  const reason = readReasonForBrand(reasonParam, brand) || "help";
  const contactEmail = contactEmailFor(brand, words);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page!.blocks} />

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,44rem)_20rem] lg:items-start lg:gap-12">
        <div>
          <nav aria-label="What is your message about?">
            <p className="text-sm font-semibold text-[var(--navy)]">What is it about?</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {reasons.map((entry) => {
                const chosen = entry.value === reason;
                return (
                  <li key={entry.value}>
                    <Link
                      href={`/contact?reason=${entry.value}`}
                      aria-current={chosen ? "true" : undefined}
                      scroll={false}
                      className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-semibold transition ${
                        chosen
                          ? "border-[var(--navy)] bg-[var(--navy)] text-white"
                          : "border-[var(--gold-light)] bg-[var(--surface)] text-[var(--navy)] hover:border-[var(--gold)]"
                      }`}
                    >
                      {entry.short}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="mt-6">
            <ContactForm reason={reason} words={{ ...words, contactEmail }} />
          </div>
        </div>

        <aside className="rounded-xl border border-[var(--gold-light)] bg-[var(--surface)] p-6 text-sm leading-6 text-stone-700">
          <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">Prefer email?</h2>
          <p className="mt-2">
            Write to{" "}
            <a
              href={`mailto:${contactEmail}`}
              className="break-words font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
            >
              {contactEmail}
            </a>
            .
          </p>
          <p className="mt-4">{words.replyPromise}</p>
        </aside>
      </section>

      <Footer />
    </main>
  );
}
