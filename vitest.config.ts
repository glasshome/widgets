import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

process.env.TZ = "UTC";

// A gate run names a results directory; the runner keeps junit and failure shots there.
const resultsDir = process.env.GATE_RESULTS_DIR;
const shuffleSeed = process.env.GATE_SHUFFLE_SEED;

export default defineConfig({
  plugins: [solid()],
  resolve: {
    conditions: ["browser", "development"],
    dedupe: ["solid-js", "solid-js/web", "solid-js/store"],
  },
  test: {
    sequence: shuffleSeed ? { shuffle: true, seed: Number(shuffleSeed) } : undefined,
    reporters: resultsDir
      ? ["default", ["junit", { outputFile: `${resultsDir}/vitest.xml` }]]
      : ["default"],
    environment: "happy-dom",
    globals: true,
    include: ["tests/dom/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/dom/setup.ts"],
    // ui's "solid" export condition points at TypeScript source, which Node cannot load from node_modules.
    server: { deps: { inline: [/@glasshome\//] } },
  },
});
