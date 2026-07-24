import Link from "next/link";
import SiteLockControl from "@/components/SiteLockControl";
import { getEditableInventory } from "@/lib/admin-inventory";
import { getDashboardStats } from "@/lib/site-analytics";

function RankedList({ title, rows, empty }: { title: string; rows: Array<{ label: string; count: number }>; empty: string }) {
  return (
    <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
      <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Activity</p>
      <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{title}</h2>
      {rows.length ? (
        <ol className="mt-5 divide-y divide-[var(--gold-light)]">
          {rows.map((row, index) => (
            <li className="flex items-center justify-between gap-4 py-3" key={row.label}>
              <span className="min-w-0 truncate text-stone-700">
                <span className="mr-3 text-xs font-bold text-[var(--gold)]">{index + 1}</span>
                {row.label}
              </span>
              <strong className="text-[var(--navy)]">{row.count}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm leading-6 text-stone-600">{empty}</p>
      )}
    </section>
  );
}

export default async function AdminPage() {
  const [stats, inventory] = await Promise.all([getDashboardStats(), getEditableInventory()]);
  const allSearches = stats.topSearches.reduce((total, item) => total + item.count, 0);
  const openInventory = inventory.items.filter((item) => item.status !== "complete").length;
  const overview = [
    { label: "Visits today", value: stats.visitsToday, detail: "Fresh activity since midnight UTC." },
    { label: "Searches today", value: stats.searchesToday, detail: "The places visitors are looking for right now." },
    { label: "All recorded visits", value: stats.visits, detail: "One visit per browser session, per page." },
    { label: "All recorded searches", value: allSearches, detail: "Use this to decide what to update next." },
    { label: "Open checklist items", value: openInventory, detail: "Pages and issues still marked not completed." },
  ];

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-6 sm:px-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove Itineraries</p>
            <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Owner&apos;s dashboard</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin/inventory" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Page inventory</Link>
            <Link href="/admin/content" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Content manager</Link>
            <Link href="/" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">View website</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          {overview.map((item) => (
            <div key={item.label} className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
              <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">{item.label}</p>
              <p className="mt-3 font-[family-name:var(--font-display)] text-5xl text-[var(--navy)]">{item.value}</p>
              <p className="mt-3 text-sm leading-6 text-stone-600">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
          <SiteLockControl initialLocked={stats.siteLocked} configured={stats.configured} />
          <section className="border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Data connection</p>
            <p className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">{stats.configured ? "Connected" : "Not connected"}</p>
            <p className="mt-3 text-sm leading-6 text-stone-600">
              {stats.configured
                ? "Visitor activity, search interest, and inventory notes are being saved privately."
                : "Connect the private analytics store to begin collecting real traffic and inventory edits."}
            </p>
          </section>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <RankedList
            title="Most searched places"
            rows={stats.topSearches}
            empty="No searches have been recorded yet. Once connected, each completed destination search will appear here."
          />
          <RankedList
            title="Most visited pages"
            rows={stats.topPages}
            empty="No page visits have been recorded yet. Once connected, you will see the pages visitors use most."
          />
        </div>

        <section className="mt-5 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.17em] text-[var(--gold)]">Owner&apos;s use</p>
          <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[var(--navy)]">Work from the inventory, then deepen the destinations.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">
            The inventory shows every page and issue by status. Use it to find incomplete pages, add your notes, and decide what should be updated next.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/admin/inventory" className="inline-block border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Open page inventory</Link>
            <Link href="/admin/content" className="inline-block border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Open content manager</Link>
            <Link href="/stops" className="inline-block border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Open destination directory</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
