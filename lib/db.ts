import { PrismaClient } from '@prisma/client';

// Prisma singleton. The DB lives on the InMotion Postgres (via pgbouncer);
// DATABASE_URL is set in the DigitalOcean App Platform env. Replaces the
// Supabase Postgres connection.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
