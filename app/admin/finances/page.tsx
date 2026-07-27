import Link from "next/link";
import AdminExpenses from "@/components/AdminExpenses";
import Footer from "@/components/Footer";

export const dynamic = "force-dynamic";

export default function AdminFinancesPage() {
  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Finances</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Log every expense — flights, hotels, marketing, software, fees — and see your totals by category and month. Private to the owner.</p>
          </div>
          <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <AdminExpenses />
      </section>
      <Footer />
    </main>
  );
}
