import { defineConfig } from "prisma/config";

// Prisma 7 configuration. The connection URL and migration/seed settings
// live here rather than in schema.prisma. DATABASE_URL must be set in the
// environment (Vercel env vars in prod, a local .env for `prisma migrate`).
//
// We read process.env directly rather than Prisma's env() helper, which
// throws when the var is absent. That lets `prisma generate` (postinstall,
// Vercel build) run without a DB. The placeholder never connects — any
// migrate/seed against it fails loudly, which is what we want.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
