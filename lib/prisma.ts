import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

// Prisma 7 connects through a driver adapter. We use Neon's serverless
// driver so it works well on Vercel's serverless/edge runtime. The
// connection string comes from DATABASE_URL (set in Vercel env vars and
// in a local .env for migrations/seeding).
//
// Cache the client on globalThis so hot-reload in dev and warm serverless
// invocations reuse one instance instead of opening a new pool each time.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to the environment.",
    );
  }
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
