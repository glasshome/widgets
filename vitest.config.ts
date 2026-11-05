import solid from "vite-plugin-solid";
import { defineConfig } from "vitest/config";

process.env.TZ = "UTC";

export default defineConfig({
  plugins: [solid()],
  resolve: {
    conditions: ["@glasshome/source", "browser", "development"],
    dedupe: ["solid-js", "solid-js/web", "solid-js/store"],
  },
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["tests/dom/**/*.test.{ts,tsx}"],
    env: { STL_SKIP_AUTO_CLEANUP: "true" },
  },
});
