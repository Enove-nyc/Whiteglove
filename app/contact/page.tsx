import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import SectionHeading from "@/components/SectionHeading";

export const metadata: Metadata = {
  title: "Contact — White Glove Itineraries",
  description: "Get in touch with White Glove Itineraries about kosher travel, kevarim, and trip planning.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)] text-[var(--ink)]">
      <Navbar />
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-20">
        <SectionHeading
          eyebrow="Contact"
          title="Begin a conversation."
          description="Tell us about your trip — kevarim, dates, kosher needs, or anything else — and we'll get back to you."
        />
        <div className="mt-10">
          <ContactForm />
        </div>
        <p className="mt-6 text-center text-sm text-stone-500">
          Prefer email? Reach us directly at{" "}
          <a href="mailto:contact@whitegloveitineraries.com" className="underline decoration-[var(--gold)] underline-offset-2">contact@whitegloveitineraries.com</a>.
        </p>
      </section>
      <Footer />
    </main>
  );
}
