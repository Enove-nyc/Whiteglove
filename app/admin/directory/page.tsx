import { emptyQuickEdit } from "@/data/listing-quick-edit";
import AdminNavLink from "@/components/AdminNavLink";
import AdminSectionScreens from "@/components/AdminSectionScreens";
import DirectoryBrowserAdmin from "@/components/DirectoryBrowserAdmin";
import { builtInDirectory, type DirectoryEntry } from "@/lib/directory-index";
import { describeDirectorySource, readProviders, type DirectorySource } from "@/lib/directory";
import { PageHeader } from "@/components/ui/PageHeader";

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
    // The ones that ship with the site, not the whole list. It counted the
    // whole list before, so the notice named a number that included his own.
    builtInCount = reading.builtIn;
    for (const p of reading.providers) {
      entries.push({
        id: `business:${p.slug}`,
        kind: "business",
        name: p.name,
        city: p.basedIn || "",
        country: p.regions?.[0] ?? "",
        editHref: `/admin/directory/businesses?slug=${p.slug}`,
        viewHref: "/directory",
        // The panel View opens. A business IS savable from here — its store
        // takes a partial update — which is why it was the one kind whose
        // View pointed at a page with no anchor to scroll to at all.
        quick: {
          kind: "business" as const,
          id: p.slug,
          savable: true,
          fullEditHref: `/admin/directory/businesses?slug=${p.slug}`,
          fields: {
            ...emptyQuickEdit(),
            name: p.name,
            city: p.basedIn ?? "",
            country: p.regions?.[0] ?? "",
            phone: p.phone ?? "",
            website: p.website ?? "",
            description: p.description ?? "",
            published: true,
          },
        },
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
        <PageHeader eyebrow="White Glove admin" title="Directory" />
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          Every beis hachaim, town and business. Search, filter, or show what is still missing.
        </p>

        {/* Never a reassurance — only ever a reason the list might not be his. */}
        {describeDirectorySource(source, builtInCount) && (
          <p className="mt-4 max-w-3xl border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            <strong>These are not your businesses.</strong> {describeDirectorySource(source, builtInCount)}
          </p>
        )}
        {/* Not a warning: the list IS his, and some of the site's own
            businesses are keeping it company. Said out loud all the same,
            because thirty listings nobody remembers adding is the kind of
            thing that gets read as an import having gone wrong. */}
        {source === "database" && builtInCount > 0 && (
          <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600">
            {builtInCount} of the businesses below are the ones that ship with the site, shown alongside your own so
            the directory is not close to empty while you build it up. Editing one makes it yours.
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <AdminNavLink
            href="/admin/kevarim"
            className="border border-[var(--navy)] bg-[var(--navy)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white transition hover:border-[var(--gold)] hover:bg-[var(--gold)]"
          >
            Add a kever
          </AdminNavLink>
          <AdminNavLink href="/admin/add" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Add a beis hachaim
          </AdminNavLink>
          <AdminNavLink href="/admin/directory/businesses?new=1" className="border border-[var(--gold)] px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">
            Add a business
          </AdminNavLink>
        </div>
      </header>

      <AdminSectionScreens sectionHref="/admin/directory" />

      <div className="mt-8">
        <DirectoryBrowserAdmin entries={entries} />
      </div>
    </>
  );
}
