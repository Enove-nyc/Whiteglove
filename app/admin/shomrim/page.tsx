import ShomerEditor, { type ShomerCemetery } from "@/components/ShomerEditor";
import { cemeteries } from "@/data/cemeteries";
import { isDbEnabled, listCemeteryContacts } from "@/lib/content-admin";

export const dynamic = "force-dynamic";

export default async function AdminShomrimPage() {
  const dbReady = isDbEnabled();

  // Every beis hachaim, whether or not anything has been stored against it —
  // the point of this screen is to correct built-in numbers, and those have no
  // database row until the first edit.
  let rows: ShomerCemetery[] = [];
  let failed = false;
  if (dbReady) {
    try {
      rows = await Promise.all(
        [...cemeteries]
          .sort((a, b) => a.city.localeCompare(b.city))
          .map(async (c) => ({
            slug: c.slug,
            city: c.city,
            country: c.country,
            name: c.name,
            builtIn: (c.accessContacts ?? []).map((x) => ({ label: x.label, name: x.name, phone: x.phone, email: x.email, note: x.note })),
            stored: await listCemeteryContacts(c.slug),
          })),
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
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold-ink)]">White Glove admin</p>
            <h1 className="mt-3 font-[family-name:var(--font-display)] text-5xl leading-tight text-[var(--navy)]">Shomer numbers</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              Correct, add or retire the access contacts on any beis hachaim — including the built-in ones,
              whose numbers used to be fixed in code and impossible to change.
            </p>
          </div>
        </div>
      </header>

      <section className="mt-8">
        {!dbReady ? (
          <p className="border-l-4 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
            Editing contacts needs the database. Set <code>DATABASE_URL</code> on the deployment; until then the
            built-in numbers show as they are.
          </p>
        ) : failed ? (
          <p className="border-l-4 border-red-400 bg-red-50 px-4 py-3 text-sm leading-6 text-red-900">
            The database could not be read. Run the import from the dashboard, then reload this page.
          </p>
        ) : (
          <ShomerEditor cemeteries={rows} />
        )}
      </section>
    </>
  );
}
