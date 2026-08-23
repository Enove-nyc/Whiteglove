import Link from "next/link";
import { notFound } from "next/navigation";
import KosherStayEditor from "@/components/KosherStayEditor";
import { getKosherStayForAdmin, isDbEnabled } from "@/lib/content-admin";
import type { Confirmed, KosherStay } from "@/data/kosher-stays";

export const dynamic = "force-dynamic";

function confirmed(value: string): Confirmed {
  return value === "yes" || value === "no" ? value : "unknown";
}

export default async function EditKosherStayPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!isDbEnabled()) notFound();

  const row = await getKosherStayForAdmin(slug);
  if (!row) notFound();

  const kinds: KosherStay["kind"][] = [
    "Kosher hotel",
    "Kosher B&B",
    "Seasonal kosher programme",
    "Kosher-friendly, in the Jewish quarter",
    "Ordinary hotel, well placed",
  ];
  const stay: KosherStay = {
    slug: row.slug,
    name: row.name,
    city: row.city,
    country: row.country,
    kind: kinds.find((k) => k === row.kind) ?? "Ordinary hotel, well placed",
    summary: row.summary,
    anchor: { name: row.anchorName, coordinates: row.anchorCoords },
    season: row.season ?? undefined,
    kosherClaim: (["none", "reported", "confirmed"] as const).find((k) => k === row.kosherClaim) ?? "none",
    notes: row.notes,
    website: row.website ?? undefined,
    sourceUrl: row.sourceUrl,
    onSiteKosherFood: confirmed(row.onSiteKosherFood),
    kosherBreakfast: confirmed(row.kosherBreakfast),
    shabbosMeals: confirmed(row.shabbosMeals),
    nearbyKosherFood: confirmed(row.nearbyKosherFood),
    nearbyShulOrMinyan: confirmed(row.nearbyShulOrMinyan),
    eruv: confirmed(row.eruv),
    shabbosAccessInfo: row.shabbosAccessInfo ?? undefined,
    shabbosElevator: confirmed(row.shabbosElevator),
    kitchenSelfCatering: confirmed(row.kitchenSelfCatering),
    kosherKitchen: confirmed(row.kosherKitchen),
    walkingDistanceToJewishArea: confirmed(row.walkingDistanceToJewishArea),
  };

  return (
    <>
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin · directory</p>
        <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
          Edit a place to stay
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
          Every box already holds what the page says now. Change what needs correcting and save — the change is on the
          site within a minute.
        </p>
        <div className="mt-5 flex flex-wrap gap-4 text-sm">
          <a
            href={`/hotels#${stay.slug}`}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[var(--gold)] underline-offset-4"
          >
            View the page ↗
          </a>
          <Link href="/admin/directory/stays" className="underline decoration-[var(--gold)] underline-offset-4">
            Back to Where to stay
          </Link>
        </div>
      </header>

      <div className="mt-8">
        <KosherStayEditor stay={stay} />
      </div>
    </>
  );
}
