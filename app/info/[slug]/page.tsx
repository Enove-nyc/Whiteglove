import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { getInfoPage } from "@/lib/pages";

// Owner-created info pages live only in the DB, so render on demand.
export const dynamic = "force-dynamic";

export default async function InfoPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getInfoPage(slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">White Glove Itineraries</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{page.title}</h1>
        </div>
      </section>
      <article className="wg-prose mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <PageBody body={page.body} className="text-[15px] leading-7 text-stone-600" />
      </article>
      <Footer />
    </main>
  );
}
