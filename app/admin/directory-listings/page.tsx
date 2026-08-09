import Link from "next/link";
import AdminDirectoryManager from "@/components/AdminDirectoryManager";

export const dynamic = "force-dynamic";

export default function AdminDirectoryListingsPage() {
  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Directory</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">Add the drivers, tour operators, planners, and agencies people can call — with phone numbers and services. Saved to your connected store and shown on <code className="rounded bg-[var(--cream)] px-1">/directory</code> right away.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/directory" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">View directory</Link>
          </div>
        </div>
      </header>
      <section className="mt-8">
        <AdminDirectoryManager />
      </section>
    </>
  );
}
