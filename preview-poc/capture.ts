import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildWidgets } from "@glasshome/widget-sdk/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import solid from "vite-plugin-solid";
import { nixLdLibraryPath } from "./nix-ld";

const here = resolve(import.meta.dirname);
const widgetsRoot = resolve(here, "..");
const outDir = resolve(here, "out");

const THEMES = ["light", "dark"] as const;

interface ShotListEntry {
  label?: string;
  size: { w: number; h: number };
}

async function main(): Promise<void> {
  // 1. Rebuild the light bundle so the authored examples land in dist/light.js.
  process.chdir(widgetsRoot);
  await buildWidgets({
    srcDir: "src",
    outDir: "dist",
    only: ["light"],
    plugins: [solid({ solid: { delegateEvents: false } })],
  });

  // 2. Serve the harness.
  const server = await createServer({ configFile: resolve(here, "vite.config.ts") });
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error("vite dev server has no local url");

  // 3. Drive Chromium: one shot per example x theme, clipped to the tile.
  mkdirSync(outDir, { recursive: true });
  // On NixOS the Playwright-downloaded Chromium can't find its system libs;
  // point nix-ld at them so the bundled browser launches unmodified.
  const nixLd = nixLdLibraryPath();
  if (nixLd) process.env.NIX_LD_LIBRARY_PATH = nixLd;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  // Enumerate the shot-list from the harness DOM (avoids importing TSX source).
  await page.goto(`${base}?ex=0&theme=light`, { waitUntil: "networkidle" });
  await page.waitForSelector("html[data-harness-examples]", { state: "attached", timeout: 30_000 });
  const examples: ShotListEntry[] = JSON.parse(
    (await page.getAttribute("html", "data-harness-examples")) ?? "[]",
  );
  if (examples.length === 0) throw new Error("light widget declares no examples");

  for (let i = 0; i < examples.length; i++) {
    const label = (examples[i].label ?? `example-${i}`).toLowerCase().replace(/\s+/g, "-");
    for (const theme of THEMES) {
      await page.goto(`${base}?ex=${i}&theme=${theme}`, { waitUntil: "networkidle" });
      await page.waitForSelector("html[data-harness-ready='1']", { state: "attached", timeout: 30_000 });
      const frame = page.locator("#frame");
      const file = resolve(outDir, `light-${label}-${theme}.png`);
      await frame.screenshot({ path: file });
      console.log(`captured ${file}`);
    }
  }

  await browser.close();
  await server.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
