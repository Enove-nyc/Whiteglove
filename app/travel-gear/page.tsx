import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import StructuredData from "@/components/StructuredData";
import { breadcrumbs } from "@/lib/structured-data";
import { pageMetadata } from "@/lib/seo";
import { AMAZON_DISCLOSURE, needsAmazonDisclosure } from "@/lib/travel-extras";
import { gearCtaFor, gearShownToVisitors, priceCheckedLabel } from "@/lib/travel-gear";
import { readGear } from "@/lib/travel-gear-store";

export async function generateMetadata() {
  const shown = gearShownToVisitors(await readGear());
  if (shown.length === 0) return { title: "Travel gear — White Glove Itineraries", robots: { index: false, follow: false } };
  return pageMetadata({
    title: "Travel gear for a kosher trip | White Glove Itineraries",
    description: "The things worth packing or picking up before you go — a travel blech, a plug adapter, and the rest of the shelf.",
    path: "/travel-gear",
  });
}

/**
 * The Amazon travel-gear shelf.
 *
 * EXISTS ONLY WHEN SOMETHING IS ON IT. An empty shop page is worse than no
 * page — see app/case-studies/page.tsx for the same rule applied to social
 * proof. gearShownToVisitors already drops anything unfinished; if that
 * leaves nothing, this route 404s rather than rendering an empty grid.
 *
 * WHY THE PRICE READS "checked 3 days ago" INSTEAD OF JUST A NUMBER. A price
 * typed in by hand goes stale, and the site's own rule (docs/vacation-
 * expansion.md) is not to publish one without a way to tell how current it
 * is. priceCheckedLabel does that arithmetic once, here, so every card is
 * honest about its own age instead of asserting a number as current fact.
 */
export default async function TravelGearPage() {
  const shown = gearShownToVisitors(await readGear());
  if (shown.length === 0) notFound();
  const amazon = needsAmazonDisclosure(shown.map((item) => ({ id: item.id, name: item.name, blurb: item.description, url: item.url })));

  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <StructuredData
        data={breadcrumbs([
          { name: "Home", path: "/" },
          { name: "Travel gear", path: "/travel-gear" },
        ])}
      />
      <Navbar />

      <section className="border-b border-[var(--gold-light)] bg-white px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gold-ink)]">Before you go</p>
          <h1 className="mt-3 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)] sm:text-5xl">Travel gear</h1>
          <p className="mt-4 text-base leading-7 text-stone-600">
            The things worth packing or picking up before a trip — the same shelf we point to when someone asks what to bring.
          </p>
          {amazon && <p className="mt-4 text-xs leading-5 text-stone-500">{AMAZON_DISCLOSURE}</p>}
        </div>
      </section>

      <section className="px-5 py-14 sm:px-8 sm:py-16">
        <div className="mx-auto grid max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => {
            const priceLabel = priceCheckedLabel(item);
            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer sponsored"
                className="flex flex-col overflow-hidden rounded-2xl border border-[var(--gold-light)] bg-white shadow-[0_8px_24px_rgba(23,45,82,.05)] transition hover:border-[var(--gold)] hover:shadow-[0_14px_34px_rgba(23,45,82,.09)]"
              >
                {item.imageUrl.trim() && (
                  // eslint-disable-next-line @next/next/no-img-element -- an
                  // owner-pasted external URL, not one next/image can optimise
                  // without an allow-listed host that changes with every item.
                  <img src={item.imageUrl} alt={item.name} className="aspect-square w-full object-cover" loading="lazy" />
                )}
                <div className="flex flex-1 flex-col justify-between p-6">
                  <div>
                    <h2 className="font-[family-name:var(--font-display)] text-lg leading-tight text-[var(--navy)]">{item.name}</h2>
                    <p className="mt-2 text-sm leading-6 text-stone-600">{item.description}</p>
                  </div>
                  <div className="mt-5 flex items-center justify-between gap-3">
                    {priceLabel && <span className="text-sm font-semibold text-stone-700">{priceLabel}</span>}
                    <span className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--gold-ink)]">{gearCtaFor(item)}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <Footer />
    </main>
  );
}
