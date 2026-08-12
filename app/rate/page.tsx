import { pageMetadata } from "@/lib/seo";
import ExperienceRatingForm from "@/components/ExperienceRatingForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import { isRatingKind, type RatingKind } from "@/lib/experience-ratings";

export const dynamic = "force-dynamic";

export const metadata = pageMetadata({
  title: "Rate how it went — White Glove Itineraries",
  description: "Tell White Glove how a place or a trip went. Private feedback — nothing is published from this page.",
  path: "/rate",
});

type Search = { kind?: string; ref?: string; label?: string };

export default async function RatePage({ searchParams }: { searchParams: Promise<Search> }) {
  const params = await searchParams;
  const kind: RatingKind = isRatingKind(params.kind) ? params.kind : "listing";
  const refId = (params.ref ?? "").trim() || "general";
  const label = (params.label ?? "").trim() || (kind === "trip" ? "Your trip" : "Something on White Glove");

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />

      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">After the trip</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)] sm:text-6xl">
            How did it go?
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            A short note for us about a place you visited or a trip you took. It stays with White Glove — we do not
            put ratings on the public pages from this form.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <ExperienceRatingForm kind={kind} refId={refId} label={label} />
      </section>

      <Footer />
    </main>
  );
}
