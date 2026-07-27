import type { Metadata } from "next";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SubmitEntryForm from "@/components/SubmitEntryForm";

export const metadata: Metadata = {
  title: "Submit an entry — White Glove Itineraries",
  description: "Send in a kever, cemetery, provider, or correction for the White Glove directory.",
};

export default function SubmitPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <Navbar />
      <section className="border-b border-[var(--gold-light)] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.26em] text-[var(--gold)]">Help the community</p>
          <h1 className="mt-5 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Send in a kever, cemetery, or provider.</h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">
            Know a kever, beis hachaim, tour operator, or driver that isn&apos;t listed yet — or a detail that should be corrected? Send it in and White Glove will review and add it.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <SubmitEntryForm />
      </section>
      <Footer />
    </main>
  );
}
