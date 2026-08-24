import ChabadDirectory from "@/components/ChabadDirectory";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";
import StructuredData from "@/components/StructuredData";
import { listChabadListings } from "@/lib/chabad-directory";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Chabad House Finder | White Glove Kosher Travel",
  description:
    "Chabad Houses worldwide with a minyan, mikveh, kosher food, or Shabbat hospitality confirmed on their own official page — each with its source and the date it was checked.",
  path: "/chabad-directory",
});

/**
 * Chabad House Finder — worldwide.
 *
 * A traveler-facing directory, not a community listing: schools, camps and
 * general programming are deliberately left out (see data/chabad-directory.ts).
 * Every card shows only what that institution's own official page confirms —
 * a Chabad House on Chabad.org's locator is not, by itself, evidence of a
 * minyan, mikveh, kosher food or Shabbat hospitality.
 */
export default function ChabadDirectoryPage() {
  const listings = listChabadListings();

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
          { name: "Chabad House Finder", path: "/chabad-directory" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Chabad House Finder
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-stone-600">
            {listings.length > 0
              ? "Chabad Houses worldwide, with only what each one's own official page confirms for a traveler — a minyan, a mikveh, kosher food, or Shabbat hospitality."
              : "This directory is being built one confirmed listing at a time — nothing appears here until it has a source and a date it was checked."}
          </p>
          <p className="mt-4 max-w-3xl rounded-lg border border-[var(--gold-light)] bg-[var(--surface)] px-4 py-3 text-sm leading-6 text-stone-600">
            <span className="font-semibold text-[var(--navy)]">Verify before traveling.</span> Minyan times, kosher
            supervision and hospitality arrangements change. Confirm directly with the Chabad House — by phone,
            WhatsApp, or its own website — before you rely on anything shown here.
          </p>
        </div>
      </section>

      {listings.length === 0 ? (
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <p className="max-w-2xl leading-7 text-stone-600">Nothing published yet.</p>
        </section>
      ) : (
        <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
          <SectionHeading eyebrow="Listings" title="Search the directory" />
          <div className="mt-8">
            <ChabadDirectory listings={listings} />
          </div>
        </section>
      )}

      <Footer />
    </main>
  );
}
