// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // For best results consider enabling R2 caching
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache
  
  // Disable incremental cache and tag cache for simpler deployment
  dangerous: {
    disableIncrementalCache: true,
    disableTagCache: true,
  },
  
  // Add Prisma client to excluded packages to avoid symlink issues on Windows
  // Note: This requires the package to be available in the Cloudflare runtime
  // We'll need to ensure @prisma/client is properly bundled
});
