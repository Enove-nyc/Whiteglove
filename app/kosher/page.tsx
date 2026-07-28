import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import KosherFinder from "@/components/KosherFinder";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage("kosher");
  return { title: page?.seoTitle, description: page?.seoDescription };
}

// The words at the top are editable; the finder below them is a tool, not
// content, so it stays in code.
export default async function KosherPage() {
  const page = (await resolvePage("kosher"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <KosherFinder />
      </section>
      <Footer />
    </main>
  );
}
