import Link from "next/link";
import DbSetupButton from "@/components/DbSetupButton";
import DirectoryProviderForm from "@/components/DirectoryProviderForm";
import { getProviderForAdmin, isDbEnabled, listProvidersForAdmin } from "@/lib/content-admin";
import { PROVIDER_CATEGORY_LABELS } from "@/data/directory";
import { businessList, describeBusinessList } from "@/lib/directory-admin";

export const dynamic = "force-dynamic";

export default async function AdminDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<{ slug?: string; new?: string }>;
}) {
  const { slug, new: isNew } = await searchParams;
  const dbReady = isDbEnabled();

  let providers: Awaited<ReturnType<typeof listProvidersForAdmin>> = [];
  let needsSetup = false;
  if (dbReady) {
    try {
      providers = await listProvidersForAdmin();
    } catch {
      needsSetup = true;
    }
  }
  const selected = dbReady && !needsSetup && slug ? await getProviderForAdmin(slug) : null;
  const showForm = Boolean(isNew) || Boolean(selected);
  // His own AND the ones that ship with the site. The list used to be his own
  // only, so an empty table read as an empty directory while every visitor was
  // being shown thirty businesses this screen never mentioned.
  const list = businessList(providers.map((p) => ({ slug: p.slug, name: p.name, category: p.category as string })));

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Businesses</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Add and edit the tour operators, vacation planners, travel agencies, and guides/drivers shown at <code className="rounded bg-[var(--cream)] px-1">/directory</code>. Business submissions from visitors appear in Suggestions for review.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/directory" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">View directory</Link>
          </div>
        </div>
      </header>

      {!dbReady ? (
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-[var(--gold-light)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">Not connected yet</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">The content database isn&apos;t connected. The public directory shows the built-in list until you connect <code className="rounded bg-[var(--cream)] px-1">DATABASE_URL</code> and run setup.</p>
          </div>
        </section>
      ) : needsSetup ? (
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <div className="border border-[var(--gold)] bg-[#fcfaf6] p-8">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--gold-ink)]">One-time setup</p>
            <p className="mt-3 text-sm leading-7 text-stone-600">Tap below to create the tables and import the built-in directory listings.</p>
            <div className="mt-6"><DbSetupButton /></div>
          </div>
        </section>
      ) : (
        <section className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[.9fr_2fr]">
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <Link href="/admin/directory?new=1" className="mb-4 block border border-[var(--navy)] bg-[var(--navy)] px-4 py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:bg-[var(--gold)] hover:border-[var(--gold)]">
              + Add a provider
            </Link>
            <nav className="border border-[var(--gold-light)] bg-[#fcfaf6] p-3">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500">
                {list.ownCount} yours · {list.builtInCount} built in
              </p>
              <ul className="space-y-1">
                {list.rows.map((provider) => {
                  const active = provider.slug === slug;
                  return (
                    <li key={provider.slug}>
                      <Link
                        href={`/admin/directory?slug=${provider.slug}`}
                        className={`flex items-center justify-between gap-2 px-3 py-2.5 text-sm transition ${active ? "bg-[var(--navy)] text-white" : "text-[var(--navy)] hover:bg-[var(--cream-deep)]"}`}
                      >
                        <span className="min-w-0 truncate font-semibold">
                          {provider.name}
                          {/* Marked, so nobody mistakes one that ships with the
                              site for something he entered. */}
                          {provider.builtIn && (
                            <span className={`ml-2 text-[9px] font-bold uppercase tracking-[0.1em] ${active ? "text-[var(--gold-light)]" : "text-stone-400"}`}>
                              built in
                            </span>
                          )}
                        </span>
                        <span className={`shrink-0 text-[9px] font-bold uppercase tracking-[0.1em] ${active ? "text-[var(--gold-light)]" : "text-stone-400"}`}>
                          {PROVIDER_CATEGORY_LABELS[provider.category as keyof typeof PROVIDER_CATEGORY_LABELS]?.english}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>

          <div>
            {showForm ? (
              <DirectoryProviderForm provider={selected} />
            ) : (
              <div className="border border-dashed border-[var(--gold-light)] p-10">
                <p className="text-center font-[family-name:var(--font-display)] text-2xl text-[var(--navy)]">Pick a provider or add a new one.</p>
                <p className="mt-2 text-center text-sm text-stone-600">Choose a listing on the left, or press “Add a provider.”</p>
                {/* The two numbers that used to disagree: what is in the
                    database, and what a visitor is actually being shown. */}
                <p className="mt-6 border-l-4 border-[var(--gold)] bg-[#fcfaf6] px-4 py-3 text-left text-sm leading-6 text-stone-700">
                  {describeBusinessList(list)}
                </p>
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
