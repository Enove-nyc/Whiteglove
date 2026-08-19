import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import DirectoryBrowser from "@/components/DirectoryBrowser";
import { featuredDisclosure } from "@/lib/features";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { getPublicProviders } from "@/lib/directory";
import { resolvePage } from "@/lib/pages";

// Not force-dynamic, and this needed a real fix rather than deleting that
// line — a plain `revalidate` window was tried on this page before and
// measured to not work, because getPublicProviders mixes a Prisma read with
// a `cache: "no-store"` fetch to Redis, and that fetch left the page frozen
// at its build-time render no matter the window. force-dynamic was the
// correct answer to that at the time: an owner's listing has to appear the
// moment it's saved, and per-request rendering guaranteed it, at the cost of
// running a real database read for every visit — including every crawler.
//
// The actual fix is in lib/directory.ts: getPublicProviders is now a tagged
// `unstable_cache`, busted by every write path the moment it saves
// (DIRECTORY_PUBLIC_TAG). That gives the same instant freshness without
// paying for a fresh render on every hit — the page can go back to being an
// ordinary cached render.
// AND RENDERED PER REQUEST, WHICH THE COMMENT ABOVE ARGUED AGAINST.
//
// The argument was sound when it was written and its premise has since gone.
// force-dynamic was removed because it "ran a real database read for every
// visit"; that stopped being true when getPublicProviders became a tagged
// cached read, so what a dynamic render costs now is the render, not the
// query.
//
// What a build-time render costs turned out to be worse. This page is baked
// when the site is built, so it holds whatever the database said at that
// moment — and when a deploy built it against a database that had just been
// replaced, the site served the thirty built-in businesses instead of the
// owner's for hours. Nothing could recover it: the tag is busted by a save,
// and no save was coming. A page whose content changes without a deploy has
// no business being decided at deploy time.
export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Directory — White Glove Kosher Travel",
  description: "Look up tour operators, vacation planners, travel agencies, guides and drivers for kosher and Jewish heritage travel.",
  path: "/directory",
});

export default async function DirectoryPage() {
  const providers = await getPublicProviders();
  const page = await resolvePage("directory");

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      {page?.edited ? (
        <PageBlocks blocks={page.blocks} />
      ) : (
        <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">White Glove directory</p>
            <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl lg:text-6xl">
              Find the people who make the trip happen.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-600">
              Tour operators, planners, agencies, guides and drivers — by name, region or specialty.
            </p>
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <DirectoryBrowser providers={providers} featuredNote={featuredDisclosure()} />

        {/* "Are you one of these businesses? Add your business" was a form
            on a page a traveler reads to find a driver. A business enquiry is
            a real thing and it has a home — the advertising reason inside
            Contact, which asks for the business, the website and where it
            operates. One line here, no form. */}
        <p className="mt-12 text-sm leading-6 text-stone-500">
          Businesses can ask to be listed.{" "}
          <Link
            href="/contact?reason=advertise"
            className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] decoration-2 underline-offset-4"
          >
            Ask about being listed
          </Link>
          .
        </p>

        <p className="mt-8 max-w-3xl text-xs leading-5 text-stone-400">
          Listings are gathered from public sources and provider submissions. White Glove does not endorse or guarantee any provider — please confirm details and kashrus arrangements directly before booking.
        </p>
      </section>

      <Footer />
    </main>
  );
}
