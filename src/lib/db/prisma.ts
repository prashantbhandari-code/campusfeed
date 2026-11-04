import { PrismaClient, Prisma } from '@prisma/client';

/**
 * Prisma client singleton.
 *
 * `next dev` re-evaluates modules on every edit, so constructing the client at
 * module scope without a guard leaks a connection pool per reload ("too many
 * clients already"). Caching it on globalThis keeps one client for the life of
 * the dev process. In production the module is evaluated once, so this is just
 * a plain singleton.
 *
 * (A Cloudflare Workers variant previously lived here, keyed per request off
 * the Hyperdrive binding. That deployment target was removed — the app runs on
 * Render over the native Node engine with a process-wide client.)
 */
const LOG: Prisma.LogLevel[] =
  process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

type Store = { prisma?: PrismaClient };
const globalForPrisma = globalThis as unknown as Store;

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: LOG });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
