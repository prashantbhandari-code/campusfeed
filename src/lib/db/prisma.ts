import { PrismaClient as PrismaClientNative, Prisma } from '@prisma/client';
// The WASM query engine is the only one that can run inside workerd: the native
// engine compiles code from strings at runtime, which Workers forbid with
// "EvalError: Code generation from strings disallowed for this context".
// The wasm entrypoint picks the right loader via the "workerd" export condition,
// so this import is inert (but harmless) in plain Node local dev.
import { PrismaClient as PrismaClientWasm } from '@prisma/client/wasm';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { getCloudflareContext } from '@opennextjs/cloudflare';

type HyperdriveBinding = { connectionString?: string };
type CfEnv = { HYPERDRIVE?: HyperdriveBinding; DATABASE_URL?: string };

type AnyPrismaClient = PrismaClientNative;

type Store = {
  prisma?: AnyPrismaClient;
};

const globalForPrisma = globalThis as unknown as Store;

/**
 * Per-request client cache for the Workers (Hyperdrive) path.
 *
 * A Prisma client wrapping a `pg.Pool` holds real sockets, and in Workers those
 * I/O objects are tied to the request context that created them. Caching such a
 * client on `globalThis` makes the *second* request reuse a socket whose context
 * already ended, so the query never resolves and the runtime cancels the request
 * ("Worker's code had hung"). Cloudflare's Hyperdrive guidance is therefore to
 * build the client inside each request rather than reuse it across requests.
 *
 * OpenNext wraps every request in `cloudflareContextALS.run({ env, ctx, cf }, …)`,
 * so `getCloudflareContext()` hands back a *distinct object per request*. Keying a
 * WeakMap on that object scopes one client to one request: the same request reuses
 * its client, the next request gets its own, and entries are collectable once the
 * request's context is unreachable.
 *
 * (AsyncLocalStorage.enterWith — the obvious alternative — throws
 * "not implemented" in workerd, so it cannot be used here.)
 */
const requestClientCache = new WeakMap<object, AnyPrismaClient>();

const LOG: Prisma.LogLevel[] = process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'];

/**
 * Read the per-request Cloudflare context object, or undefined outside a Workers
 * request (`next dev`, `next build`, static prerender) where getCloudflareContext
 * throws or has nothing to offer.
 */
function readCloudflareContext(): object | undefined {
  try {
    const ctx = getCloudflareContext() as unknown as object | undefined;
    return typeof ctx === "object" && ctx !== null ? ctx : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Read the edge Postgres connection string: the Hyperdrive binding if present,
 * else a DATABASE_URL secret in the Worker env (Freebuff Sites provisions no
 * Hyperdrive, so the secret is the only edge binding there).
 *
 * Returns undefined outside a Workers request — there is no request context
 * there, so we fall back to DATABASE_URL via the native client.
 */
function readHyperdriveUrl(cfContext: object | undefined): string | undefined {
  const env = (cfContext as { env?: CfEnv } | undefined)?.env;
  // Hyperdrive (edge pooling) when the binding exists; otherwise a DATABASE_URL
  // secret. Either way the string points the pg driver at Postgres — without
  // Hyperdrive we merely lose edge pooling and open per-request sockets.
  const url = env?.HYPERDRIVE?.connectionString || env?.DATABASE_URL;
  return typeof url === 'string' && url.length > 0 ? url : undefined;
}

function createClient(mode: 'hyperdrive' | 'native'): AnyPrismaClient {
  if (mode === 'hyperdrive') {
    const connectionString = readHyperdriveUrl(readCloudflareContext());
    if (connectionString) {
      // Hyperdrive owns connection pooling at the edge; allow up to 3 local
      // sockets so parallel queries (like collectDelta's 7 queries) don't serialize.
      // Driver adapters require the WASM engine — the native engine cannot run here.
      // The pool lives only for the request that created it (see requestClientCache).
      const pool = new Pool({ connectionString, max: 3 });
      return new PrismaClientWasm({
        adapter: new PrismaPg(pool),
        log: LOG,
      }) as unknown as AnyPrismaClient;
    }
  }

  // Local dev / build: Prisma's native engine over DATABASE_URL.
  return new PrismaClientNative({ log: LOG });
}

function getClient(): AnyPrismaClient {
  const cfContext = readCloudflareContext();
  const hyperdriveUrl = readHyperdriveUrl(cfContext);

  // Not inside a Workers request (`next dev`, `next build`, prerender). Node has
  // a real process-wide event loop, so a module-level singleton is safe here.
  if (!hyperdriveUrl || !cfContext) {
    if (!globalForPrisma.prisma) {
      globalForPrisma.prisma = createClient('native');
    }
    return globalForPrisma.prisma;
  }

  // Inside a Workers request: reuse this request's client, else build one and
  // bind it to this request's context object.
  const cached = requestClientCache.get(cfContext);
  if (cached) return cached;

  const client = createClient('hyperdrive');
  requestClientCache.set(cfContext, client);
  return client;
}

/**
 * Resolves the client lazily on first property access, so the Hyperdrive
 * binding is read during a request rather than at module evaluation.
 *
 * A Proxy keeps the existing `prisma.model.op(...)` call sites unchanged
 * across the codebase while deferring construction.
 */
const prisma = new Proxy({} as AnyPrismaClient, {
  get(_target, prop) {
    const client = getClient();
    const value = Reflect.get(client as unknown as object, prop, client);
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(client) : value;
  },
});

export default prisma;
