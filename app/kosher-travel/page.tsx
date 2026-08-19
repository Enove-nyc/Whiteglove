import Link from "next/link";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import TravelExtras from "@/components/TravelExtras";
import { readExtras } from "@/lib/travel-extras-store";
import StructuredData from "@/components/StructuredData";
import { pageMetadata } from "@/lib/seo";
import { resolvePage } from "@/lib/pages";
import { breadcrumbs } from "@/lib/structured-data";

export const metadata = pageMetadata({
  title: "Kosher travel — food, Shabbos, minyanim and mikvaos | White Glove Kosher Travel",
  description:
    "Kosher food, places to stay, shuls, mikvaos, zmanim and kevarim — the practical side of travelling kosher, in one place.",
  path: "/kosher-travel",
});

/**
 * The practical side of travelling kosher, in one place.
 *
 * A HUB, NOT A BROCHURE. This page used to open with stat tiles ("N Jewish
 * quarters mapped", "N places to stay") and close with a repeat of the
 * verification explainer. The redesign removes every public count and every
 * repeated explanation: each card below is a door, and the page behind the
 * door does the talking. The glossary that lived here moved to its own
 * reference page at /kosher-travel/glossary.
 */

const questions: Array<{ title: string; href: string }> = [
  { title: "Kosher food", href: "/kosher" },
  { title: "Where to stay", href: "/hotels" },
  { title: "Shuls", href: "/shuls" },
  { title: "Mikvaos", href: "/mikvaos" },
  { title: "Eruvin", href: "/eruvin" },
  { title: "Zmanim", href: "/zmanim" },
  { title: "Kevarim", href: "/tzaddikim" },
  { title: "Cemeteries", href: "/cemeteries" },
  { title: "Shabbos away from home", href: "/destinations" },
  { title: "Drivers, guides and contacts", href: "/directory" },
];

export default async function KosherTravelPage() {
  // The heading at the top is editable in /admin/pages; the doors and the gear
  // shelf below stay in code, the way /kosher keeps its finder.
  const [extras, page] = await Promise.all([readExtras(), resolvePage("kosher-travel")]);

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Kosher travel", path: "/kosher-travel" },
        ])}
      />
      <Navbar />

      <PageBlocks blocks={page!.blocks} />

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-16">
        <nav aria-label="Kosher travel tools">
          <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
            {questions.map((question) => (
              <li key={question.href}>
                <Link
                  href={question.href}
                  className="wg-card block h-full border border-[var(--gold-light)] bg-[var(--surface)] p-6 transition hover:border-[var(--gold)] hover:shadow-md"
                >
                  <span className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)]">
                    {question.title}
                  </span>
                  <span className="mt-2 block text-sm font-semibold text-[var(--gold-ink)]" aria-hidden="true">
                    →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-8 text-sm">
          <Link
            href="/kosher-travel/glossary"
            className="inline-flex min-h-11 items-center font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Glossary — hechsher, eruv, minyan and more →
          </Link>
        </p>
      </section>

      {/* WHAT SOMEBODY TAKES WITH THEM. Renders nothing until the owner has
          added something. */}
      <TravelExtras
        extras={extras}
        heading="Worth taking with you"
        intro="Bought from the seller, not from us. Nothing here is a recommendation about which to choose."
      />
      <p className="px-5 pb-12 text-center text-sm sm:px-8">
        <Link href="/travel-gear" className="font-semibold text-[var(--gold-ink)] underline">
          See the full travel gear shelf →
        </Link>
      </p>

      <Footer />
    </main>
  );
}
