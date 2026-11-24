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
    // Whole values in test.each titles keep two cases from sharing one results-ledger id.
    taskTitleValueFormatTruncate: 0,
    // Vitest's shared default directory is wiped by any suite whose lockfile differs, and its key misses workspace exports edits.
    fsModuleCache: false,
    reporters: resultsDir
      ? ["default", ["junit", { outputFile: `${resultsDir}/vitest.xml` }]]
      : ["default"],
    environment: "happy-dom",
    // test-change-ok hang guard for expect.poll, below the 5 s testTimeout; provisional until the nightly stress ledger measures it
    expect: { poll: { timeout: 4_000 } },
    globals: true,
    include: ["tests/dom/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/dom/setup.ts"],
    // ui's "solid" export condition points at TypeScript source, which Node cannot load from node_modules.
    server: { deps: { inline: [/@glasshome\//] } },
  },
});
