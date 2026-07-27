// Creates the tables (by running the generated init SQL) and loads the content
// from data/*.ts. Runs wherever the DB is reachable — notably the Vercel
// runtime — so setup needs no terminal. Safe to re-run: it recreates the
// imported content tables from the static data each time.

import type { PrismaClient } from "@prisma/client";
import { INIT_SQL } from "@/lib/init-sql";
import { buildSeedRows, countSeedRows, DEFAULT_SETTINGS } from "@/lib/seed-data";

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

  // The init SQL has one statement per ";" with no semicolons inside literals,
  // so a plain split is safe. Comments (-- ...) are valid inside a statement.
  const statements = INIT_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    try {
      await prisma.$executeRawUnsafe(statement);
    } catch (error) {
      // Ignore objects that already exist (table/type/index/constraint), so
      // re-runs and incremental schema additions are safe; rethrow anything else.
      const message = error instanceof Error ? error.message : String(error);
      if (/already exists/i.test(message)) continue;
      throw error;
    }
  }
  return { created: !alreadyProvisioned };
}

/** Replace the imported content tables with fresh rows from data/*.ts. */
export async function seedDatabase(prisma: PrismaClient) {
  const rows = buildSeedRows();

  // Clear children first (FK order), then reload parents-first.
  await prisma.contact.deleteMany();
  await prisma.tzaddik.deleteMany();
  await prisma.practicalPlace.deleteMany();
  await prisma.cemetery.deleteMany();
  await prisma.destination.deleteMany();
  await prisma.directoryProvider.deleteMany();

  await prisma.destination.createMany({ data: rows.destinations });
  await prisma.cemetery.createMany({ data: rows.cemeteries });
  await prisma.tzaddik.createMany({ data: rows.tzaddikim });
  await prisma.contact.createMany({ data: rows.contacts });
  await prisma.practicalPlace.createMany({ data: rows.places });
  await prisma.directoryProvider.createMany({ data: rows.directory });

  await prisma.siteSetting.upsert({
    where: { id: DEFAULT_SETTINGS.id },
    update: {},
    create: DEFAULT_SETTINGS,
  });

  return countSeedRows(rows);
}
