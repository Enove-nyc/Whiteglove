import Link from "next/link";
import AboutProfileSection from "@/components/AboutProfileSection";
import CaseStudiesSection from "@/components/CaseStudiesSection";
import Footer from "@/components/Footer";
import GloveMark from "@/components/GloveMark";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import StartingPoints from "@/components/StartingPoints";
import { pageMetadata } from "@/lib/seo";
import { resolvePage } from "@/lib/pages";
import { readAboutProfile } from "@/lib/about-profile-store";
import { readPublicCaseStudies } from "@/lib/case-studies-store";
import { readWords } from "@/lib/site-words-store";
import { currentBrand } from "@/lib/site-brand";
import { BRAND_NAME } from "@/lib/site-brand-core";
import { contactEmailFor } from "@/lib/site-words";

export async function generateMetadata() {
  const [page, brand] = await Promise.all([resolvePage("about"), currentBrand()]);
  const name = BRAND_NAME[brand];
  // The stored seoTitle is the owner's own words and stays his to write — but
  // it is one string shown on both domains, so it must not be what decides
  // which domain this page is canonical on. Hence the explicit brand below.
  //
  // AND IT IS ONLY HIS WHEN HE HAS WRITTEN IT. resolvePage returns the
  // BUILT-IN page when he has not, and every built-in seoTitle is kosher copy
  // that names that brand outright — "About White Glove Kosher Travel — who we
  // are and how we work". Read unconditionally it is the right title on the
  // kosher brand and the wrong company on the other, in the tab, the search
  // result, the share card, and og:site_name, which pageMetadata settles from
  // whichever name the title carries. So: his edit on either brand, the
  // built-in only on the brand it was written for.
  const written = page?.edited || brand === "kosher" ? page : null;
  return pageMetadata({
    title: written?.seoTitle ?? `About — ${name}`,
    description:
      written?.seoDescription ??
      `Who is behind ${name}, how the practical detail on this site is put together, and how to reach a person.`,
    path: "/about",
    brand,
  });
}

/**
 * Who is behind this.
 *
 * Personal facts come from /admin/settings/about (never invented). Case studies
 * from /admin/settings/proof appear only when complete, permitted and approved.
 * The process blocks below stay editable via /admin/pages.
 */
export default async function AboutPage() {
  const [page, words, profile, studies, siteBrand] = await Promise.all([
    resolvePage("about"),
    readWords(),
    readAboutProfile(),
    readPublicCaseStudies(),
    currentBrand(),
  ]);

  // Hero is rendered by AboutProfileSection so empty personal fields can hide
  // cleanly; skip a duplicate hero block from the page editor.
  const blocks = (page?.blocks ?? []).filter((block) => !(block.kind === "hero" && block.id === "about-hero"));

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <AboutProfileSection profile={profile} siteBrand={siteBrand} />
      <PageBlocks blocks={blocks} />
      <CaseStudiesSection studies={studies} />

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="rounded-2xl border border-[var(--navy)] bg-[var(--navy)] p-6 text-white sm:p-9">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <GloveMark size="lg" />
            <h2 className="font-[family-name:var(--font-display)] text-3xl leading-tight sm:text-4xl">
              Talk to a person
            </h2>
          </div>
          <p className="mt-4 max-w-2xl leading-7 text-slate-200">
            {siteBrand === "itineraries"
              ? "Ask about a plan, tell us something on the site is broken, or ask a question."
              : "Write about a trip, tell us something on the site is wrong, or ask a question about a destination."}{" "}
            {words.replyPromise}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href="/contact"
              className="inline-flex min-h-11 items-center rounded-md bg-[var(--gold)] px-6 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy-deep)] transition hover:bg-[var(--gold-light)]"
            >
              Open the contact form
            </Link>
            {/* AN ADDRESS IS DATA, NOT A LABEL, and it was being set as one.
                Uppercase at 0.12em tracking made these thirty-four characters
                403 pixels wide, which is wider than a phone — it was the only
                thing on the site still scrolling a page sideways once the root
                element stopped hiding it. Sentence case at its own size, and
                free to break if a longer address ever lands here. */}
            <a
              href={`mailto:${contactEmailFor(siteBrand, words)}`}
              className="inline-flex min-h-11 max-w-full items-center break-all rounded-md border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:border-[var(--gold-light)] hover:text-[var(--gold-light)]"
            >
              {contactEmailFor(siteBrand, words)}
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <StartingPoints heading="Where to start" />
      </section>

      <Footer />
    </main>
  );
}
