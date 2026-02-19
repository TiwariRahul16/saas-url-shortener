import { PrismaClient } from "@prisma/client";

declare global {
  // Prevent multiple instances in development (hot reload fix)
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: ["error", "warn"], // production-safe logging
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

