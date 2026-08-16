import { notFound } from "next/navigation";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBody from "@/components/PageBody";
import { getInfoPage } from "@/lib/pages";
import { pageMetadata } from "@/lib/seo";

// Owner-created info pages live only in the DB, so render on demand.
export const dynamic = "force-dynamic";

// An owner-written page carries its own title. Falling back to the site's
// generic one is what made every page look the same in a search result.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getInfoPage(slug);
  if (!page) return pageMetadata({ title: "Page not found | White Glove Kosher Travel", description: "This page could not be found.", path: `/info/${slug}`, noIndex: true });
  return pageMetadata({
    title: `${page.title} | White Glove Kosher Travel`,
    // The first couple of sentences of what the owner actually wrote, rather
    // than a description invented for them.
    description: page.body.replace(/\s+/g, " ").trim().slice(0, 155) || `${page.title} — White Glove Kosher Travel.`,
    path: `/info/${page.slug}`,
  });
}

export default async function InfoPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getInfoPage(slug);
  if (!page) notFound();

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="wg-page-hero border-b border-[var(--gold-light)] px-5 py-14 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold-ink)]">White Glove Kosher Travel</p>
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
