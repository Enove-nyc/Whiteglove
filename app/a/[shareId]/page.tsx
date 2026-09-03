import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import AddonsClientView from "@/components/AddonsClientView";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { getSharedAddons } from "@/lib/account-store";
import { pageMetadata } from "@/lib/seo";
import { currentBrand } from "@/lib/site-brand";

// An add-ons list is handed to one client, not found — the same reason
// /i, /p and /f are noindexed.
export async function generateMetadata() {
  const itineraries = (await currentBrand()) === "itineraries";
  return pageMetadata({
    title: itineraries ? "Trip add-ons | White Glove Itineraries" : "Trip add-ons | White Glove Kosher Travel",
    description: "Optional extras offered on your trip.",
    path: "/a",
    noIndex: true,
  });
}

export const dynamic = "force-dynamic";

export default async function AddonsSharePage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const shared = await getSharedAddons(shareId);

  if (!shared) {
    return (
      <main className="min-h-screen bg-[var(--cream)]">
        <Navbar />
        <section className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
          <EmptyState
            title="This link isn't available"
            description="It may have been turned off. Ask your travel adviser for a fresh link."
            action={<LinkButton href="/">Back to White Glove</LinkButton>}
          />
        </section>
        <Footer />
      </main>
    );
  }

  const { items, tripName, ownerName, advisor } = shared;

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
        <div className="border border-[var(--gold-light)] bg-[#FAF8F3] p-6 sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--gold-ink)]">Trip add-ons</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-2xl leading-tight text-[var(--navy)] sm:text-3xl">
            {tripName || "Your trip"}
          </h1>
          <p className="mt-2 text-sm text-stone-600">Offered by {advisor || ownerName || "your travel adviser"}</p>
        </div>

        <AddonsClientView shareId={shareId} items={items} />
      </section>
      <Footer />
    </main>
  );
}
