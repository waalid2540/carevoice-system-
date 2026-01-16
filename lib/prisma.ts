import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    // Return a proxy that throws on actual usage, but allows build to complete
    return new Proxy({} as PrismaClient, {
      get(_, prop) {
        if (prop === "then") return undefined; // Allow Promise checks
        throw new Error("DATABASE_URL environment variable is required");
      },
    });
  }

  if (!globalForPrisma.pool) {
    globalForPrisma.pool = new Pool({
      connectionString,
      max: 10,
      ssl: connectionString.includes("render.com") || connectionString.includes("neon.tech")
        ? { rejectUnauthorized: false }
        : undefined,
    });
  }

  const adapter = new PrismaPg(globalForPrisma.pool);

  return new PrismaClient({
    adapter,
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
