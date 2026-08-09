import Link from "next/link";

export default function FullPagePlaceholder({
  title = "We’re Preparing Something Special",
  description = "This page is currently under development as we carefully build a more complete and useful travel experience. Thank you for your patience. Please check back soon as new information and services are being added regularly.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <main className="min-h-screen bg-[var(--cream)] px-5 py-10 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-4xl flex-col justify-center border border-[var(--gold-light)] bg-[#fcfaf6] p-8 shadow-[0_12px_30px_rgba(23,45,82,.08)] sm:p-12">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove Itineraries</p>
        <h1 className="mt-4 font-[family-name:var(--font-display)] text-4xl leading-tight text-[var(--navy)] sm:text-5xl">{title}</h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-stone-600">{description}</p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">Return home</Link>
          <Link href="/stops" className="border border-[var(--gold-light)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">Browse destinations</Link>
          <Link href="/services" className="border border-[var(--gold-light)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">Join the update list</Link>
          <Link href="/services" className="border border-[var(--gold-light)] px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-[var(--navy)]">Contact us</Link>
        </div>
      </section>
    </main>
  );
}
