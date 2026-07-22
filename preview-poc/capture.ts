import { mkdirSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { buildWidgets } from "@glasshome/widget-sdk/vite";
import { createServer } from "vite";
import solid from "vite-plugin-solid";
import {
  watchEgress,
  withFreshBrowser,
  withRenderTimeout,
  withSharedBrowser,
} from "./worker-constraints";

const here = resolve(import.meta.dirname);
const widgetsRoot = resolve(here, "..");
const distDir = resolve(widgetsRoot, "dist");
const outDir = resolve(here, "out");

const THEMES = ["light", "dark"] as const;

interface ShotListEntry {
  label?: string;
  size: { w: number; h: number };
}

interface Failure {
  widget: string;
  kind: "network" | "hang";
  detail: string;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-");
}

async function main(): Promise<void> {
  // Optional CLI filter: `bun capture.ts camera media-player` shoots a subset.
  // Camera and media-player are the widgets most likely to reach the network or
  // hang, so they are the useful first targets.
  //
  // `--isolate` gives every render its own browser PROCESS, matching the
  // worker's cross-render contamination rule. It costs a launch per shot, and
  // it is orthogonal to the egress question — a fresh context already gives the
  // lock everything it needs — so it is opt-in rather than the default.
  const argv = process.argv.slice(2);
  const isolate = argv.includes("--isolate");
  const only = argv.filter((a) => !a.startsWith("--"));

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
  const origin = new URL(base).origin;

  mkdirSync(outDir, { recursive: true });

  // 3. Enumerate each widget's shot list (one locked browser for the whole pass).
  const shotLists = new Map<string, ShotListEntry[]>();
  const skipped: string[] = [];
  await withFreshBrowser(async (page) => {
    watchEgress(page, origin);
    for (const widget of widgetNames) {
      await page.goto(`${base}?widget=${widget}&ex=0&theme=light`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("html[data-harness-examples]", {
        state: "attached",
        timeout: 30_000,
      });
      const examples: ShotListEntry[] = JSON.parse(
        (await page.getAttribute("html", "data-harness-examples")) ?? "[]",
      );
      if (examples.length === 0) skipped.push(widget);
      else shotLists.set(widget, examples);
    }
  });

  // 4. Render every shot under the worker's constraints.
  let shot = 0;
  const failures: Failure[] = [];

  const runAll = async (newPage: (() => Promise<import("playwright").Page>) | null) => {
    for (const [widget, examples] of shotLists) {
      const widgetAttempts = new Set<string>();

      for (let i = 0; i < examples.length; i++) {
        const label = slug(examples[i].label ?? `example-${i}`);
        for (const theme of THEMES) {
          const url = `${base}?widget=${widget}&ex=${i}&theme=${theme}`;
          const file = resolve(outDir, `${widget}-${label}-${theme}.png`);

          const shoot = async (page: import("playwright").Page) => {
            const lock = watchEgress(page, origin);
            await page.goto(url, { waitUntil: "domcontentloaded" });
            await page.waitForSelector("html[data-harness-ready='1']", {
              state: "attached",
              timeout: 20_000,
            });
            await page.locator("#stage").screenshot({ path: file, omitBackground: true });
            for (const a of lock.attempts) widgetAttempts.add(a);
          };

          try {
            await withRenderTimeout(`${widget} / ${label} / ${theme}`, async () => {
              if (newPage) {
                const page = await newPage();
                try {
                  await shoot(page);
                } finally {
                  await page.context().close();
                }
              } else {
                await withFreshBrowser(shoot);
              }
            });
            shot++;
          } catch (err) {
            failures.push({
              widget,
              kind: "hang",
              detail: `${label}/${theme}: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }
      }

      for (const a of widgetAttempts) {
        failures.push({ widget, kind: "network", detail: a });
      }
      const flag = widgetAttempts.size ? `  ⚠ needs network (${widgetAttempts.size})` : "";
      console.log(`${widget}: ${examples.length} example(s)${flag}`);
    }
  };

  if (isolate) await runAll(null);
  else await withSharedBrowser((newPage) => runAll(newPage));

  await server.close();

  // 5. Verdict.
  console.log(`\n${shot} shot(s) across ${shotLists.size} widget(s).`);
  if (skipped.length) console.log(`no examples (skipped): ${skipped.join(", ")}`);

  const network = failures.filter((f) => f.kind === "network");
  const hangs = failures.filter((f) => f.kind === "hang");

  // Nothing can actually leave — DNS is blackholed. These are blocked attempts,
  // i.e. what each widget wanted from the network and must degrade without.
  if (network.length) {
    console.log(`\n⚠ NETWORK: ${network.length} blocked request(s) — all denied, none left the machine`);
    for (const f of network) console.log(`   ${f.widget}  ${f.detail}`);
  } else {
    console.log("\n✓ NETWORK: no widget attempted to reach the network");
  }

  if (hangs.length) {
    console.log(`\n✗ RENDER: ${hangs.length} render(s) failed or timed out`);
    for (const f of hangs) console.log(`   ${f.widget}  ${f.detail}`);
  } else {
    console.log("✓ RENDER: every render settled inside the timeout");
  }

  if (hangs.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
