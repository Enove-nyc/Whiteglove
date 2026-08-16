import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Kosher travel glossary | White Glove Kosher Travel",
  description: "What hechsher, eruv, minyan, mikvah, kever and shomer mean on this site.",
  path: "/kosher-travel/glossary",
});

/**
 * The reference page for the words the site uses without stopping to explain
 * them. This lived on /kosher-travel; the hub became a set of doors and a
 * glossary is not a door, so it has its own address now.
 */

const TERMS: Array<[string, string]> = [
  [
    "Hechsher",
    "The certification that food is kosher, and the body that gives it. A listing names the body when White Glove has a recorded status.",
  ],
  [
    "Eruv",
    "A boundary around a neighbourhood that allows carrying on Shabbos within it. Where a quarter has one, it changes what a Shabbos there looks like with children.",
  ],
  [
    "Minyan",
    "A quorum for communal prayer. “Walking distance to a minyan” is the single most common request on a trip like this.",
  ],
  [
    "Mikvah",
    "A ritual bath. Availability and hours vary a great deal outside large communities, which is why we say to confirm before travelling.",
  ],
  [
    "Kever / kevarim",
    "A grave, and graves — usually of a tzaddik, a righteous person whose resting place people travel to.",
  ],
  [
    "Shomer",
    "The person who holds the key to a cemetery or looks after it. Whether you can get in often depends on reaching them.",
  ],
];

export default function KosherTravelGlossaryPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
          { name: "Glossary", path: "/kosher-travel/glossary" },
        ])}
      />
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-12 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">Kosher travel</p>
          <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.25rem,6vw,3.75rem)] leading-[1.08] text-[var(--navy)]">
            Glossary
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <dl className="space-y-4">
          {TERMS.map(([term, meaning]) => (
            <div key={term} className="border-t border-[var(--gold-light)] pt-4 first:border-t-0 first:pt-0">
              <dt className="font-[family-name:var(--font-display)] text-xl text-[var(--navy)]">{term}</dt>
              <dd className="mt-1 leading-7 text-stone-600">{meaning}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-sm">
          <Link
            href="/kosher-travel"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            ← Kosher travel
          </Link>
        </p>
      </section>

      <Footer />
    </main>
  );
}
