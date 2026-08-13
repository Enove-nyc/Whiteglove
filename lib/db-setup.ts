// Creates the tables (by running the generated init SQL) and loads the content
// from data/*.ts. Runs wherever the DB is reachable — notably the Vercel
// runtime — so setup needs no terminal. Safe to re-run: it recreates the
// imported content tables from the static data each time.

import { updateTag } from "next/cache";
import { recordChange } from "@/lib/changes-store";
import type { PrismaClient } from "@prisma/client";
import { DIRECTORY_PUBLIC_TAG } from "@/lib/directory";
import { INIT_SQL } from "@/lib/init-sql";
import { UPGRADE_SQL } from "@/lib/upgrade-sql";
import { buildSeedRows, countSeedRows, DEFAULT_SETTINGS } from "@/lib/seed-data";

/**
 * Split a SQL script into statements on the semicolons that actually end one.
 *
 * A plain `split(";")` was doing this, on the assumption that no semicolon ever
 * appeared inside a literal or a comment. One did — a comment above the Page
 * columns read "…covers a fresh database; these cover one provisioned before
 * the column existed." The split cut the comment in half, so the next statement
 * began with the bare words "these cover one provisioned…", Postgres rejected
 * it as a syntax error, and because that is not an "already exists" error the
 * whole run stopped there. Setup and re-import both failed, and the three Page
 * columns the page editor needs were never added.
 *
 * So: semicolons inside single-quoted literals, double-quoted identifiers,
 * dollar-quoted blocks and both kinds of comment are left alone. Fragments that
 * turn out to hold no SQL at all — a trailing run of comments — are dropped
 * rather than sent to the database as an empty query.
 *
 * DOLLAR QUOTING is the same bug again, found the same way. A statement of the
 * form `DO $$ BEGIN … EXCEPTION … END $$;` — the only way to add a foreign key
 * only if it is missing — has two semicolons INSIDE it, so it came out as three
 * fragments: an unterminated block, a bare `EXCEPTION`, and a stray `END $$`.
 * All three are syntax errors rather than "already exists", so the run stopped
 * and everything after it was skipped.
 */
export function splitSql(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let comment: "line" | "block" | null = null;
  // The tag of the dollar-quoted block we are inside — "$$" or "$name$".
  let dollar: string | null = null;

  for (let i = 0; i < sql.length; i += 1) {
    const c = sql[i];
    const next = sql[i + 1];

    if (dollar) {
      if (sql.startsWith(dollar, i)) {
        current += dollar;
        i += dollar.length - 1;
        dollar = null;
        continue;
      }
      current += c;
      continue;
    }

    if (comment === "line") {
      current += c;
      if (c === "\n") comment = null;
      continue;
    }
    if (comment === "block") {
      current += c;
      if (c === "*" && next === "/") { current += next; i += 1; comment = null; }
      continue;
    }
    if (quote) {
      current += c;
      // '' inside a literal is an escaped quote, not the end of it.
      if (c === quote && next === quote) { current += next; i += 1; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "-" && next === "-") { current += c + next; i += 1; comment = "line"; continue; }
    if (c === "/" && next === "*") { current += c + next; i += 1; comment = "block"; continue; }
    if (c === "'" || c === '"') { current += c; quote = c; continue; }
    // $$ … $$ or $tag$ … $tag$. Only an opening tag counts here; the closing
    // one is matched above, against the tag we opened with.
    if (c === "$") {
      const tag = /^\$\w*\$/.exec(sql.slice(i))?.[0];
      if (tag) { current += tag; i += tag.length - 1; dollar = tag; continue; }
    }
    if (c === ";") { statements.push(current); current = ""; continue; }
    current += c;
  }
  statements.push(current);

  return statements.filter((s) => hasSql(s)).map((s) => s.trim());
}

/** True when a fragment holds something other than whitespace and comments. */
function hasSql(fragment: string): boolean {
  return (
    fragment
      .replace(/\/\*[\s\S]*?\*\//g, " ")
      .replace(/--[^\n]*/g, " ")
      .trim().length > 0
  );
}

/**
 * Create any missing tables/enums. Idempotent: it runs the full init SQL every
 * time, swallowing "already exists" errors, so it both provisions a fresh
 * database AND adds newly-introduced tables (e.g. DirectoryProvider) to a
 * database that was set up before those models existed. Returns whether the
 * core schema was absent beforehand (for the UI message).
 */
export async function ensureTables(prisma: PrismaClient): Promise<{ created: boolean }> {
  // Use information_schema (returns a plain boolean) rather than to_regclass,
  // whose `regclass` return type the driver adapter can't deserialize.
  const existing = await prisma.$queryRawUnsafe<Array<{ present: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Destination'
     ) AS present`,
  );
  const alreadyProvisioned = Boolean(existing?.[0]?.present);

  // INIT_SQL builds a database from empty. UPGRADE_SQL is what an older one
  // still needs — the columns and enum values a from-empty script cannot add,
  // because on an existing table every CREATE in it fails "already exists" and
  // is skipped. Both, in that order, so one button does the whole job.
  for (const statement of [...splitSql(INIT_SQL), ...splitSql(UPGRADE_SQL)]) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      // Ignore objects that already exist (table/type/index/constraint), so
      // re-runs and incremental schema additions are safe; rethrow anything else.
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message)) continue;
      // Say WHICH statement failed. Without this the admin screen showed a bare
      // Postgres error with nothing to connect it to, and the only way to find
      // out what had broken was to read the whole script by hand.
      const first = statement.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("--")) ?? statement.trim();
      throw new Error(`${message} — while running: ${first.slice(0, 120)}`);
    }
  }
  return { created: !alreadyProvisioned };
}

/**
 * Reload the built-in content from data/*.ts. Deletes are SCOPED to the slugs
 * that ship in the built-in data, so anything the owner added in the admin
 * (new cemeteries, tzaddikim, directory providers with their own slugs, pages)
 * is preserved across a re-import. (Note: a tzadik/contact the owner attaches
 * to a *built-in* cemetery or destination is refreshed away, since that parent
 * is reloaded; owner-created cemeteries and their tzaddikim persist.)
 */
/**
 * Put the businesses a re-import is about to overwrite into the change history.
 *
 * ONLY the ones that would actually change. A re-import that restores a
 * business to exactly what it already said is not an edit, and recording thirty
 * of those every time would bury the one that mattered.
 *
 * Never throws. A history that cannot be written is not a reason to refuse the
 * re-import — but it is a reason to say so, which the count returned here lets
 * the setup result do.
 */
async function recordProvidersBeingReplaced(
  prisma: PrismaClient,
  slugs: string[],
  incoming: Array<Record<string, unknown> & { slug: string; name: string }>,
): Promise<number> {
  try {
    const existing = await prisma.directoryProvider.findMany({ where: { slug: { in: slugs } } });
    const shipped = new Map(incoming.map((p) => [p.slug, p]));
    let recorded = 0;
    for (const row of existing) {
      const next = shipped.get(row.slug);
      if (!next) continue;
      // Compare only the fields the import actually writes back — a differing
      // updatedAt is not something the owner typed.
      const changed = Object.keys(next).some((field) => {
        const before = (row as unknown as Record<string, unknown>)[field];
        return JSON.stringify(before ?? null) !== JSON.stringify(next[field] ?? null);
      });
      if (!changed) continue;
      await recordChange({
        kind: "business",
        rowId: row.slug,
        title: row.name,
        before: row as unknown as Record<string, unknown>,
        after: next as Record<string, unknown>,
      });
      recorded += 1;
    }
    return recorded;
  } catch {
    return 0;
  }
}

export async function seedDatabase(prisma: PrismaClient) {
  const rows = buildSeedRows();

  const cemeterySlugs = rows.cemeteries.map((c) => c.slug);
  const destinationSlugs = rows.destinations.map((d) => d.slug);
  const providerSlugs = rows.directory.map((p) => p.slug);

  // Clear children of built-in parents first (FK order), then the parents —
  // all scoped by built-in slug so owner-added rows are untouched.
  const builtInChildFilter = {
    OR: [
      { cemetery: { slug: { in: cemeterySlugs } } },
      { destination: { slug: { in: destinationSlugs } } },
    ],
  };
  // ONLY the ones this import is about to write again.
  //
  // These used to delete EVERY child of a built-in parent, then re-create the
  // built-in ones — so a kever the owner added to Albertirsa, or a phone number
  // he corrected on a built-in beis hachaim, was destroyed by an import he
  // pressed for an unrelated reason. He would not have been told; the row was
  // simply gone, and the page went back to what ships in the code.
  //
  // Matching by name means the built-in records are still refreshed from
  // data/*.ts, which is what a re-import is for, while anything the owner added
  // under his own name survives. A correction he made to a built-in person is
  // still overwritten — that is what "reload the built-in content" means — but
  // it no longer takes his own additions down with it.
  await prisma.contact.deleteMany({
    where: { AND: [builtInChildFilter, { label: { in: rows.contacts.map((c) => c.label) } }] },
  });
  await prisma.tzaddik.deleteMany({
    where: { AND: [builtInChildFilter, { name: { in: rows.tzaddikim.map((t) => t.name) } }] },
  });
  await prisma.practicalPlace.deleteMany({
    where: {
      destination: { slug: { in: destinationSlugs } },
      name: { in: rows.places.map((p) => p.name) },
    },
  });
  // These four have no children, so replacing them outright costs nothing.
  //
  // EXCEPT THAT IT COSTS THE OWNER'S EDITS, and that is the whole point of the
  // lines above it. A re-import restores the thirty built-in businesses to what
  // ships in data/directory.ts — which is what "reload the built-in content"
  // means and is not a bug. What WAS a bug is that it happened without a trace:
  // a phone number he corrected, a description he rewrote, the note about who
  // to ask for — all silently back to the shipped text, with the count still
  // reading thirty so nothing looked missing until somebody read them.
  //
  // Reported as "my whole directory got lost", and rightly.
  //
  // Every ordinary edit goes through updateProvider, which records what it said
  // before. This did not, because it writes to Prisma directly. So it records
  // them itself, first — one entry per business that is actually about to
  // change, putting the previous values into /admin/history where the owner can
  // read them and put any of them back.
  const replacedProviders = await recordProvidersBeingReplaced(prisma, providerSlugs, rows.directory);
  await prisma.directoryProvider.deleteMany({ where: { slug: { in: providerSlugs } } });
  await prisma.attraction.deleteMany({ where: { slug: { in: rows.attractions.map((a) => a.slug) } } });
  await prisma.kosherStay.deleteMany({ where: { slug: { in: rows.stays.map((s) => s.slug) } } });
  await prisma.kosherArea.deleteMany({ where: { slug: { in: rows.areas.map((a) => a.slug) } } });

  // DESTINATIONS AND CEMETERIES ARE UPDATED IN PLACE, NEVER DELETED.
  //
  // Deleting a built-in beis hachaim took its contacts with it (Contact
  // cascades) and — worse — ORPHANED every tzadik the owner had added to it:
  // Tzaddik.cemetery is SetNull, so the row survived with no cemetery, which
  // means it exists, is on no page, and never will be. That is what "I added a
  // kever and it doesn't show up" looks like from the inside, and it happened
  // on an import pressed for a completely unrelated reason.
  //
  // Updating in place keeps the row id, so everything hanging off it stays
  // attached. Batched in one transaction rather than 297 round trips.
  const upsertBySlug = async <T extends { slug: string; id?: string }>(
    model: { upsert: (args: unknown) => unknown },
    list: T[],
  ) => {
    await prisma.$transaction(
      list.map(({ id, ...fields }) =>
        // `update` deliberately omits the id: the row keeps the one it has, and
        // that is the whole point — everything attached to it stays attached.
        model.upsert({ where: { slug: fields.slug }, update: fields, create: { id, ...fields } }),
      ) as never,
    );
  };

  await upsertBySlug(prisma.destination as never, rows.destinations);

  // The seed wires children to the ids it just invented. An upserted parent
  // keeps whatever id it already had, so those references have to be pointed
  // at the real rows before anything is written against them.
  const realDestinationId = new Map(
    (await prisma.destination.findMany({
      where: { slug: { in: destinationSlugs } },
      select: { id: true, slug: true },
    })).map((d) => [d.slug, d.id]),
  );
  const seededDestinationSlug = new Map(rows.destinations.map((d) => [d.id, d.slug]));
  const remapDestination = <T extends { destinationId?: string | null }>(row: T): T => {
    if (!row.destinationId) return row;
    const slug = seededDestinationSlug.get(row.destinationId);
    const real = slug ? realDestinationId.get(slug) : undefined;
    return real ? { ...row, destinationId: real } : row;
  };

  await upsertBySlug(prisma.cemetery as never, rows.cemeteries.map(remapDestination));

  // And the same for cemeteries, which the tzaddikim point at.
  const realCemeteryId = new Map(
    (await prisma.cemetery.findMany({
      where: { slug: { in: cemeterySlugs } },
      select: { id: true, slug: true },
    })).map((c) => [c.slug, c.id]),
  );
  const seededCemeterySlug = new Map(rows.cemeteries.map((c) => [c.id, c.slug]));
  const remap = <T extends { destinationId?: string | null; cemeteryId?: string | null }>(row: T): T => {
    const next = remapDestination(row);
    if (!next.cemeteryId) return next;
    const slug = seededCemeterySlug.get(next.cemeteryId);
    const real = slug ? realCemeteryId.get(slug) : undefined;
    return real ? { ...next, cemeteryId: real } : next;
  };

  await prisma.tzaddik.createMany({ data: rows.tzaddikim.map(remap) });
  await prisma.contact.createMany({ data: rows.contacts.map(remap) });
  await prisma.practicalPlace.createMany({ data: rows.places.map(remap) });
  // THIS LINE WAS MISSING, and it is the bug behind "my whole directory got
  // lost". The re-import deleted all thirty built-in businesses and never wrote
  // them back — while countSeedRows still reported "imported 30 directory
  // listings", so the button said it had done the thing it had just undone.
  // Everything else in the seed had its createMany; this one did not.
  await prisma.directoryProvider.createMany({ data: rows.directory });
  await prisma.attraction.createMany({ data: rows.attractions });
  await prisma.kosherStay.createMany({ data: rows.stays });
  await prisma.kosherArea.createMany({ data: rows.areas });

  await prisma.siteSetting.upsert({
    where: { id: DEFAULT_SETTINGS.id },
    update: {},
    create: DEFAULT_SETTINGS,
  });

  // The re-import writes directory rows directly through Prisma rather than
  // createProvider, so it is the one write path that does not already bust
  // the tag by calling that function — done here instead, or a re-import
  // would go stale on the public page the same way it used to.
  updateTag(DIRECTORY_PUBLIC_TAG);

  // The count of businesses whose own wording this import has just replaced,
  // alongside the row counts. Silence here is what made a re-import feel like
  // a lost directory.
  return { ...countSeedRows(rows), replacedProviders };
}
