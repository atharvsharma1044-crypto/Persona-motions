import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  dbAvailable: boolean | null;
  lastDbCheck: number;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

let dbAvailable: boolean | null = globalForPrisma.dbAvailable ?? null;
let lastDbCheck = globalForPrisma.lastDbCheck ?? 0;

export async function isDatabaseAvailable(): Promise<boolean> {
  const now = Date.now();
  if (dbAvailable !== null && now - lastDbCheck < 30000) {
    return dbAvailable;
  }

  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("USER:PASSWORD") || dbUrl.includes("your_")) {
    dbAvailable = false;
    lastDbCheck = now;
    globalForPrisma.dbAvailable = false;
    globalForPrisma.lastDbCheck = now;
    return false;
  }

  try {
    const connectPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Database check timeout")), 800)
    );
    await Promise.race([connectPromise, timeoutPromise]);
    dbAvailable = true;
    lastDbCheck = now;
    globalForPrisma.dbAvailable = true;
    globalForPrisma.lastDbCheck = now;
    return true;
  } catch {
    dbAvailable = false;
    lastDbCheck = now;
    globalForPrisma.dbAvailable = false;
    globalForPrisma.lastDbCheck = now;
    return false;
  }
}
