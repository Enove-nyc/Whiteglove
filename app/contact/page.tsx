import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import ContactForm from "@/components/ContactForm";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage("contact");
  return { title: page?.seoTitle, description: page?.seoDescription };
}

// The words at the top are editable; the form below them is a tool, not
// content, so it stays in code.
export default async function ContactPage() {
  const page = (await resolvePage("contact"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <ContactForm />
      </section>
      <Footer />
    </main>
  );
}
