import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildWidgets } from "@glasshome/widget-sdk/vite";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import solid from "vite-plugin-solid";
import {
  freezeClock,
  NO_EGRESS_ARGS,
  settleAnimations,
  watchEgress,
} from "../../../widget-cli/src/preview/constraints";
import { OUT_DIR } from "./out";

const [widgetsArg, themeArg = "dark", exArg = "0"] = process.argv.slice(2);
const only = widgetsArg ? widgetsArg.split(",") : [];
const out = OUT_DIR;
mkdirSync(out, { recursive: true });
const project = resolve(import.meta.dirname, "../..");
process.chdir(project);
await buildWidgets({
  srcDir: "src",
  outDir: "dist",
  ...(only.length ? { only } : {}),
  plugins: [solid({ solid: { delegateEvents: false } })],
});
const HEIGHTS = process.env.HEIGHTS
  ? process.env.HEIGHTS.split(",").map(Number)
  : [70, 156, 242, 328];
const WIDTHS = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map(Number)
  : [84, 150, 200, 270, 340, 420];
const server = await createServer({
  root: import.meta.dirname,
  configFile: false,
  logLevel: "error",
  plugins: [tailwindcss(), solid({ solid: { delegateEvents: false } })],
  server: { fs: { allow: [resolve(import.meta.dirname, "../../../../..")] } },
});
await server.listen();
const base = server.resolvedUrls?.local[0];
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: NO_EGRESS_ARGS,
});
for (const w of only) {
  const m = JSON.parse(readFileSync(`src/${w}/manifest.json`, "utf8"));
  for (const ex of exArg.split(","))
    for (const theme of themeArg.split(","))
      for (const ph of HEIGHTS)
        for (const pw of WIDTHS) {
          const rows = Math.round((ph + 16) / 86);
          if (rows < m.minSize.h || rows > m.maxSize.h) continue;
          const page = await (await browser.newContext()).newPage();
          try {
            watchEgress(page, new URL(base).origin);
            if (process.env.CLICK)
              await page.addInitScript(() => {
                const o = Element.prototype.attachShadow;
                Element.prototype.attachShadow = function (i) {
                  return o.call(this, { ...i, mode: "open" });
                };
              });
            if (process.env.AT) await page.clock.install({ time: new Date(process.env.AT) });
            else await freezeClock(page);
            await page.goto(
              `${base}?widget=${w}&ex=${ex}&theme=${theme}&pw=${pw}&ph=${ph}${process.env.Q ? `&${process.env.Q}` : ""}`,
              { waitUntil: "domcontentloaded" },
            );
            await page.waitForSelector("html[data-harness-ready='1']", {
              state: "attached",
              timeout: 20000,
            });
            await settleAnimations(page);
            if (process.env.CLICK) {
              await page.locator(process.env.CLICK).first().click();
              await page.clock.runFor(1500);
              await page.waitForTimeout(1200);
            }
            await page.locator("#stage").screenshot({
              path: `${out}/${w}-e${ex}-${theme}${process.env.TAG ?? ""}-${pw}x${ph}.png`,
              omitBackground: true,
            });
          } catch (e) {
            console.log(`FAIL ${w} ${pw}x${ph} ${e}`);
          } finally {
            await page
              .context()
              .close()
              .catch(() => {});
          }
        }
}
await browser.close();
await server.close();
process.exit(0);
