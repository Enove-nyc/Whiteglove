import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage("travel-insurance");
  return { title: page?.seoTitle, description: page?.seoDescription };
}

export default async function TravelInsurancePage() {
  const page = (await resolvePage("travel-insurance"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      <Footer />
    </main>
  );
}
