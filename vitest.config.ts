import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

process.env.TZ = "UTC";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    conditions: ["browser", "development"],
    dedupe: ["solid-js", "solid-js/web", "solid-js/store"],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/dom/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/dom/setup.ts"],
    // ui's "solid" export condition points at TypeScript source, which Node cannot load from node_modules.
    server: { deps: { inline: [/@glasshome\//] } },
  },
});
