import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    // Unit tests run in node (fast), React component tests use @vitest-environment jsdom
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // forks pool fails to spawn workers on this Windows/pi-node setup
    pool: "threads",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
