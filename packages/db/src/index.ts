import { PrismaClient } from "@prisma/client";

// Re-export all generated Prisma types + enums so consumers import from one place.
export * from "@prisma/client";
export * from "./settings.js";

// Single shared PrismaClient instance (avoids exhausting connections during
// dev hot-reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "production" ? ["error"] : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
