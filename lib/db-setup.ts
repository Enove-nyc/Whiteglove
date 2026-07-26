// Creates the tables (by running the generated init SQL) and loads the content
// from data/*.ts. Runs wherever the DB is reachable — notably the Vercel
// runtime — so setup needs no terminal. Safe to re-run: it recreates the
// imported content tables from the static data each time.

import type { PrismaClient } from "@prisma/client";
import { INIT_SQL } from "@/lib/init-sql";
import { buildSeedRows, countSeedRows, DEFAULT_SETTINGS } from "@/lib/seed-data";

/** Create the tables if they don't exist yet. Returns whether it created them. */
export async function ensureTables(prisma: PrismaClient): Promise<{ created: boolean }> {
  // Use information_schema (returns a plain boolean) rather than to_regclass,
  // whose `regclass` return type the driver adapter can't deserialize.
  const existing = await prisma.$queryRawUnsafe<Array<{ present: boolean }>>(
    `SELECT EXISTS (
       SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'Destination'
     ) AS present`,
  );
  if (existing?.[0]?.present) return { created: false };

  // The init SQL has one statement per ";" with no semicolons inside literals,
  // so a plain split is safe. Comments (-- ...) are valid inside a statement.
  const statements = INIT_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
  return { created: true };
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

  await prisma.destination.createMany({ data: rows.destinations });
  await prisma.cemetery.createMany({ data: rows.cemeteries });
  await prisma.tzaddik.createMany({ data: rows.tzaddikim });
  await prisma.contact.createMany({ data: rows.contacts });
  await prisma.practicalPlace.createMany({ data: rows.places });

  await prisma.siteSetting.upsert({
    where: { id: DEFAULT_SETTINGS.id },
    update: {},
    create: DEFAULT_SETTINGS,
  });

  return countSeedRows(rows);
}
