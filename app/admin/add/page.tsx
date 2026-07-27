import Link from "next/link";
import AddEntryForms from "@/components/AddEntryForms";
import Footer from "@/components/Footer";
import { isDbEnabled, listCemeteriesForAdmin } from "@/lib/content-admin";
import { listInfoPages } from "@/lib/pages";

export const dynamic = "force-dynamic";

export default async function AdminAddPage() {
  const dbReady = isDbEnabled();
  let cemeteries: Awaited<ReturnType<typeof listCemeteriesForAdmin>> = [];
  let infoPages: Awaited<ReturnType<typeof listInfoPages>> = [];
  let needsSetup = false;
  if (dbReady) {
    try {
      [cemeteries, infoPages] = await Promise.all([listCemeteriesForAdmin(), listInfoPages()]);
    } catch {
      needsSetup = true;
    }
  }

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <header className="border-b border-[var(--gold-light)]">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Add a new entry</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Add a cemetery, a tzadik, or a new page — save what you have now and fill in the rest later. Your additions are kept even when built-in content is re-imported.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/admin/content" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Review submissions</Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {!dbReady ? (
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Not connected yet</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">Connect the content database (add <code className="rounded bg-[var(--cream)] px-1">DATABASE_URL</code> and run setup on the Destination editor) before adding new entries.</p>
          </div>
        ) : needsSetup ? (
          <div className="border border-[var(--gold)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">One-time setup needed</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">Run the database import once on the <Link href="/admin/destinations" className="underline">Destination editor</Link>, then come back here.</p>
          </div>
        ) : (
          <>
            <AddEntryForms cemeteries={cemeteries} />

            {infoPages.length > 0 && (
              <div className="mt-10 border border-[var(--gold-light)] bg-[#fcfaf6] p-6">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Your info pages</p>
                <ul className="mt-4 divide-y divide-[var(--gold-light)]">
                  {infoPages.map((page) => (
                    <li key={page.slug} className="flex items-center justify-between gap-3 py-3">
                      <Link href={`/info/${page.slug}`} className="font-semibold text-[var(--navy)] underline decoration-[var(--gold)] underline-offset-4">{page.title}</Link>
                      <span className="text-xs font-bold uppercase tracking-[0.1em] text-stone-400">{page.status !== "PUBLISHED" ? page.status : `/info/${page.slug}`}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </section>
      <Footer />
    </main>
  );
}
