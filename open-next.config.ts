// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const managed = defineCloudflareConfig({
  // For best results consider enabling R2 caching
  // See https://opennext.js.org/cloudflare/caching for more details
  // incrementalCache: r2IncrementalCache
});

// `pg` declares pg-cloudflare as an optionalDependency. Next's node-file-trace
// resolves its exports with Node's `default` condition, so only
// `dist/empty.js` gets traced into the server bundle. OpenNext's esbuild then
// resolves it with the `workerd` condition, which needs `dist/index.js`
// (the real CloudflareSocket implementation), and the build fails with
// `Could not resolve "pg-cloudflare"`.
//
// `install` runs after file tracing and force-copies the complete package over
// the partial trace. Runtime needs it too: on Workers, pg loads
// CloudflareSocket from this package.
export default {
  ...managed,
  default: {
    ...managed.default,
    install: {
      packages: ["pg-cloudflare@1.4.1"],
    },
  },
};
