// Creates the tables (by running the generated init SQL) and loads the content
// from data/*.ts. Runs wherever the DB is reachable — notably the Vercel
// runtime — so setup needs no terminal. Safe to re-run: it recreates the
// imported content tables from the static data each time.

import type { PrismaClient } from "@prisma/client";
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
  await prisma.contact.deleteMany({ where: builtInChildFilter });
  await prisma.tzaddik.deleteMany({ where: builtInChildFilter });
  await prisma.practicalPlace.deleteMany({ where: { destination: { slug: { in: destinationSlugs } } } });
  await prisma.cemetery.deleteMany({ where: { slug: { in: cemeterySlugs } } });
  await prisma.destination.deleteMany({ where: { slug: { in: destinationSlugs } } });
  await prisma.directoryProvider.deleteMany({ where: { slug: { in: providerSlugs } } });
  await prisma.attraction.deleteMany({ where: { slug: { in: rows.attractions.map((a) => a.slug) } } });
  await prisma.kosherStay.deleteMany({ where: { slug: { in: rows.stays.map((s) => s.slug) } } });
  await prisma.kosherArea.deleteMany({ where: { slug: { in: rows.areas.map((a) => a.slug) } } });

  await prisma.destination.createMany({ data: rows.destinations });
  await prisma.cemetery.createMany({ data: rows.cemeteries });
  await prisma.tzaddik.createMany({ data: rows.tzaddikim });
  await prisma.contact.createMany({ data: rows.contacts });
  await prisma.practicalPlace.createMany({ data: rows.places });
  await prisma.directoryProvider.createMany({ data: rows.directory });
  await prisma.attraction.createMany({ data: rows.attractions });
  await prisma.kosherStay.createMany({ data: rows.stays });
  await prisma.kosherArea.createMany({ data: rows.areas });

  await prisma.siteSetting.upsert({
    where: { id: DEFAULT_SETTINGS.id },
    update: {},
    create: DEFAULT_SETTINGS,
  });

  return countSeedRows(rows);
}
