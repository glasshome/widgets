import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildWidgets } from "@glasshome/widget-sdk/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import solid from "vite-plugin-solid";
import { nixLdLibraryPath } from "./nix-ld";

const here = resolve(import.meta.dirname);
const widgetsRoot = resolve(here, "..");
const distDir = resolve(widgetsRoot, "dist");
const outDir = resolve(here, "out");

const THEMES = ["light", "dark"] as const;

interface ShotListEntry {
  label?: string;
  size: { w: number; h: number };
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

async function main(): Promise<void> {
  // Optional CLI filter: `bun capture.ts light weather` builds/shoots a subset.
  const only = process.argv.slice(2);

  // 1. Build the widget bundles so authored examples land in dist/<name>.js.
  process.chdir(widgetsRoot);
  await buildWidgets({
    srcDir: "src",
    outDir: "dist",
    ...(only.length ? { only } : {}),
    plugins: [solid({ solid: { delegateEvents: false } })],
  });

  const widgetNames = readdirSync(distDir)
    .filter((f) => f.endsWith(".js"))
    .map((f) => f.slice(0, -3))
    .filter((n) => (only.length ? only.includes(n) : true))
    .sort();

  // 2. Serve the harness.
  const server = await createServer({ configFile: resolve(here, "vite.config.ts") });
  await server.listen();
  const base = server.resolvedUrls?.local[0];
  if (!base) throw new Error("vite dev server has no local url");

  // 3. Drive Chromium: one shot per widget x example x theme, clipped to the tile.
  mkdirSync(outDir, { recursive: true });
  // On NixOS the Playwright-downloaded Chromium can't find its system libs;
  // point nix-ld at them so the bundled browser launches unmodified.
  const nixLd = nixLdLibraryPath();
  if (nixLd) process.env.NIX_LD_LIBRARY_PATH = nixLd;
  const browser = await chromium.launch();
  const context = await browser.newContext({ deviceScaleFactor: 2 });
  const page = await context.newPage();

  let shot = 0;
  const skipped: string[] = [];
  for (const widget of widgetNames) {
    // Enumerate the widget's shot-list from the harness DOM.
    await page.goto(`${base}?widget=${widget}&ex=0&theme=light`, { waitUntil: "networkidle" });
    await page.waitForSelector("html[data-harness-examples]", {
      state: "attached",
      timeout: 30_000,
    });
    const examples: ShotListEntry[] = JSON.parse(
      (await page.getAttribute("html", "data-harness-examples")) ?? "[]",
    );
    if (examples.length === 0) {
      skipped.push(widget);
      continue;
    }

    for (let i = 0; i < examples.length; i++) {
      const label = slug(examples[i].label ?? `example-${i}`);
      for (const theme of THEMES) {
        await page.goto(`${base}?widget=${widget}&ex=${i}&theme=${theme}`, {
          waitUntil: "networkidle",
        });
        await page.waitForSelector("html[data-harness-ready='1']", {
          state: "attached",
          timeout: 30_000,
        });
        const file = resolve(outDir, `${widget}-${label}-${theme}.png`);
        await page.locator("#stage").screenshot({ path: file, omitBackground: true });
        shot++;
      }
    }
    console.log(`${widget}: ${examples.length} example(s)`);
  }

  await browser.close();
  await server.close();

  console.log(`\n${shot} shot(s) across ${widgetNames.length - skipped.length} widget(s).`);
  if (skipped.length) console.log(`no examples (skipped): ${skipped.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
