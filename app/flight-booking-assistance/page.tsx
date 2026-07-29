import type { Metadata } from "next";
import FlightRequestForm from "@/components/FlightRequestForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import PageBlocks from "@/components/PageBlocks";
import { resolvePage } from "@/lib/pages";

export async function generateMetadata(): Promise<Metadata> {
  const page = await resolvePage("flight-booking-assistance");
  return { title: page?.seoTitle, description: page?.seoDescription };
}

export default async function FlightBookingAssistancePage() {
  const page = (await resolvePage("flight-booking-assistance"))!;
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <PageBlocks blocks={page.blocks} />
      {/* The page lists what to send us; this is how it gets sent. Kept out of
          the blocks so the page stays editable in the admin without the form
          being something that can be deleted by accident. */}
      <section className="mx-auto max-w-4xl px-5 pb-16 sm:px-8">
        <FlightRequestForm />
      </section>
      <Footer />
    </main>
  );
}
