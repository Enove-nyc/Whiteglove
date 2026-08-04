import Link from "next/link";
import DirectoryBrowserAdmin from "@/components/DirectoryBrowserAdmin";
import { builtInDirectory, type DirectoryEntry } from "@/lib/directory-index";
import { describeDirectorySource, readProviders, type DirectorySource } from "@/lib/directory";

export const dynamic = "force-dynamic";

// Everything in the directory, in one list.
//
// The batei hachaim and towns come from code, the businesses from whichever
// store holds them. Reading the businesses is allowed to fail — the rest of the
// list is still worth showing, and a missing store is a Settings problem rather
// than a reason to show nothing.
export default async function AdminDirectoryPage() {
  const entries: DirectoryEntry[] = builtInDirectory();
  // Where the businesses came from, so this screen can say when it is showing
  // the ones that ship with the site rather than his. It used to show them
  // silently, which is how a directory can look as though it has been lost.
  let source: DirectorySource = "database-failed";
  let builtInCount = 0;

  try {
    const reading = await readProviders();
    source = reading.source;
    builtInCount = reading.providers.length;
    for (const p of reading.providers) {
      entries.push({
        id: `business:${p.slug}`,
        kind: "business",
        name: p.name,
        city: p.basedIn || "",
        country: p.regions?.[0] ?? "",
        editHref: `/admin/directory/businesses?slug=${p.slug}`,
        viewHref: "/directory",
        published: true,
        missing: [
          !p.phone && !p.email ? "no way to contact them" : "",
          !p.description ? "no description" : "",
        ].filter(Boolean),
        haystack: `${p.name} ${p.basedIn ?? ""} ${(p.regions ?? []).join(" ")} ${p.tagline ?? ""}`.toLowerCase(),
      });
    }
  } catch {
    /* the batei hachaim and towns are still worth listing */
  }

  return (
    <>
      <header>
        <h1 className="font-[family-name:var(--font-display)] text-4xl text-[var(--navy)]">Directory</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Every beis hachaim, town and business in one list. Search it, narrow it by country, or show only the
          entries that are still missing something.
        </p>

        {/* Never a reassurance — only ever a reason the list might not be his. */}
        {describeDirectorySource(source, builtInCount) && (
          <p className="mt-4 max-w-3xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <strong>These are not your businesses.</strong> {describeDirectorySource(source, builtInCount)}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/admin/kevarim"
            className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Add a kever
          </Link>
          <Link href="/admin/add" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Add a beis hachaim
          </Link>
          <Link href="/admin/directory/businesses?new=1" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Add a business
          </Link>
        </div>
      </header>

      <div className="mt-8">
        <DirectoryBrowserAdmin entries={entries} />
      </div>
    </>
  );
}
