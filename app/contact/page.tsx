import { readWords } from "@/lib/site-words-store";
import { pageMetadata } from "@/lib/seo";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
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
 * One contact page, one form (owner, 20 November 2026: "a single page not 3
 * separate tabs"). It used to offer a reason first — help, something broken,
 * another question — each with its own form; now there is a single form that
 * goes to the inbox a person reads, with the email address beside it. An old
 * link carrying ?reason= simply opens this same form.
 */
export default async function ContactPage() {
  const [page, words, brand] = await Promise.all([resolvePage("contact"), readWords(), currentBrand()]);
  const contactEmail = contactEmailFor(brand, words);

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page!.blocks} />

      <section className="mx-auto grid max-w-7xl gap-8 px-5 pb-16 pt-8 sm:px-8 sm:pt-10 lg:grid-cols-[minmax(0,44rem)_20rem] lg:items-start lg:gap-12">
        <ContactForm reason="help" words={{ ...words, contactEmail }} />

        <p className="text-sm text-stone-700">
          <a href={`mailto:${contactEmail}`} className="break-words font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4">
            {contactEmail}
          </a>
        </p>
      </section>

      <Footer />
    </main>
  );
}
