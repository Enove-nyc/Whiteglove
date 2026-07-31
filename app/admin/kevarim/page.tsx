import Link from "next/link";
import KeverEditor, { type EditorCemetery, type OrphanedBurial } from "@/components/KeverEditor";
import { cemeteries } from "@/data/cemeteries";
import { cemeteryPhotosBySlug, isDbEnabled, listCemeteriesForAdmin, listCemeteryBurials, listOrphanedBurials } from "@/lib/content-admin";

export const dynamic = "force-dynamic";

export default async function AdminKevarimPage() {
  const dbReady = isDbEnabled();

  // Every beis hachaim on the site, built-in or owner-added. The built-in ones
  // have no database row until something is saved against them, which is why
  // they can't come from a Prisma query alone.
  let rows: EditorCemetery[] = [];
  // People a re-import detached from their beis hachaim. Almost always empty.
  let orphans: OrphanedBurial[] = [];
  let failed = false;

  if (dbReady) {
    try {
      const builtInSlugs = new Set(cemeteries.map((c) => c.slug));
      // One query for every stored picture rather than one per beis hachaim:
      // 175 round trips to answer "none" for nearly all of them is not a page.
      const [rowsForAdmin, photos, detached] = await Promise.all([
        listCemeteriesForAdmin(),
        cemeteryPhotosBySlug(),
        listOrphanedBurials(),
      ]);
      orphans = detached;
      const added = rowsForAdmin.filter((c) => !builtInSlugs.has(c.slug));

      const all = [
        ...cemeteries.map((c) => ({
          slug: c.slug,
          city: c.city,
          country: c.country,
          name: c.name,
          // Every field, not three of them: the editor pre-fills its form from
          // this, and a partial record would quietly blank whatever it omitted.
          builtIn: c.burials.map((b) => ({
            name: b.name, yiddishName: b.yiddishName, knownAs: b.knownAs,
            seforim: b.seforim, yahrzeit: b.yahrzeit, note: b.note,
          })),
        })),
        ...added.map((c) => ({ slug: c.slug, city: c.city, country: c.country, name: c.name, builtIn: [] })),
      ].sort((a, b) => a.city.localeCompare(b.city));

      rows = await Promise.all(
        all.map(async (c) => ({ ...c, stored: await listCemeteryBurials(c.slug), photos: photos.get(c.slug) ?? [] })),
      );
    } catch {
      failed = true;
    }
  }

  return (
    <>
      <header>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">
              Kevarim
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Two ways in, depending on what you know. Add a person to a beis hachaim that is already on the site, or
              start from the person and create the beis hachaim around him.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/admin" className="border border-[var(--gold)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Dashboard</Link>
            <Link href="/admin/shomrim" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">Shomer numbers</Link>
            <Link href="/cemeteries" className="border border-[var(--gold-light)] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-[var(--navy)]">The directory</Link>
          </div>
        </div>
      </header>

      <section className="mt-8">
        {!dbReady ? (
          <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Adding kevarim needs the database. Set <code>DATABASE_URL</code> on the deployment; until then the
            built-in kevarim show as they are.
          </p>
        ) : failed ? (
          <p className="border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
            The database could not be read. Run the import from the{" "}
            <Link href="/admin/destinations" className="underline">Destination editor</Link>, then reload this page.
          </p>
        ) : (
          <KeverEditor cemeteries={rows} orphans={orphans} />
        )}
      </section>
    </>
  );
}
