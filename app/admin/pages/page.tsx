import Link from "next/link";
import PageEditor from "@/components/PageEditor";
import { isDbEnabled } from "@/lib/content-admin";
import { getPageForAdmin, listPagesForAdmin } from "@/lib/pages";

// Admin data must always reflect the latest DB state.
export const dynamic = "force-dynamic";

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string }>;
}) {
  const { slug } = await searchParams;
  const dbReady = isDbEnabled();
  const pages = await listPagesForAdmin();
  const selected = slug ? await getPageForAdmin(slug) : null;

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Page editor</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Edit the heading and intro text on the general pages — Services, Planning, Honeymoon, Getaways, and the service pages. Changes go live within a minute.
            </p>
          </div>
        </div>
      </header>

      {!dbReady && (
        <section className="mx-auto max-w-5xl px-5 pt-8 sm:px-8">
          <div className="border border-[var(--gold)] bg-[#fcfaf6] p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold)]">Not connected yet</p>
            <p className="mt-2 text-sm leading-6 text-stone-600">
              The content database isn&apos;t connected, so saving is disabled and the pages show their built-in defaults. Connect <code className="rounded bg-[var(--cream)] px-1">DATABASE_URL</code> and run the one-time setup on the destination editor to enable editing.
            </p>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[.9fr_2fr]">
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <nav className="border border-[var(--gold-light)] bg-[#fcfaf6] p-3">
            <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">Pages</p>
            <ul className="space-y-1">
              {pages.map((page) => {
                const active = page.slug === slug;
                return (
                  <li key={page.slug}>
                    <Link
                      href={`/admin/pages?slug=${page.slug}`}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition ${
                        active ? "bg-[var(--navy)] text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"
                      }`}
                    >
                      <span className="min-w-0 truncate font-semibold">{page.title}</span>
                      {page.status !== "PUBLISHED" && (
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.1em] ${active ? "text-[var(--gold-light)]" : "text-stone-400"}`}>{page.status === "DRAFT" ? "Draft" : "Review"}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        <div>
          {selected ? (
            <PageEditor page={selected} />
          ) : (
            <div className="border border-dashed border-[var(--gold-light)] p-10 text-center">
              <p className="font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Pick a page to start editing.</p>
              <p className="mt-2 text-sm text-stone-600">Choose a page on the left.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
