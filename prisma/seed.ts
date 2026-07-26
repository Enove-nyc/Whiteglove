/**
 * CLI seed — imports the static data/*.ts content into Postgres.
 *
 *   npx prisma db seed          # real run (tables must already exist)
 *   SEED_DRY_RUN=1 npx tsx prisma/seed.ts   # validate mapping, no DB
 *
 * The same import logic powers the in-app setup route (lib/db-setup.ts), so
 * the terminal and the admin button produce identical data.
 */
import { buildSeedRows, countSeedRows } from "@/lib/seed-data";

async function main() {
  const rows = buildSeedRows();
  const counts = countSeedRows(rows);

  if (process.env.SEED_DRY_RUN === "1") {
    console.log("[seed dry run] would insert:");
    console.log(JSON.stringify(counts, null, 2));
    return;
  }

  const { prisma } = await import("@/lib/prisma");
  const { seedDatabase } = await import("@/lib/db-setup");
  console.log("Seeding database...");
  const result = await seedDatabase(prisma);
  console.log("Seed complete:", JSON.stringify(result, null, 2));
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
