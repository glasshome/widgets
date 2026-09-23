import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { chromium } from "playwright";
import { createServer } from "vite";
import solid from "vite-plugin-solid";

const server = await createServer({
  root: import.meta.dirname,
  configFile: false,
  logLevel: "error",
  plugins: [tailwindcss(), solid({ solid: { delegateEvents: false } })],
  server: { fs: { allow: [resolve(import.meta.dirname, "../../../../..")] } },
});
await server.listen();
const base = server.resolvedUrls?.local[0];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage();
await p.addInitScript(() => {
  const o = Element.prototype.attachShadow;
  Element.prototype.attachShadow = function (i) {
    const r = o.call(this, { ...i, mode: "open" });
    const w = window as unknown as { __srs?: ShadowRoot[] };
    w.__srs = [...(w.__srs ?? []), r];
    return r;
  };
});
p.on("console", (m) => console.log("console:", m.text()));
await p.goto(
  `${base}?widget=${process.argv[2]}&ex=0&theme=dark&pw=${process.env.PW ?? 300}&ph=${process.env.PH ?? 242}`,
);
await p.waitForSelector("html[data-harness-ready='1']", { state: "attached" });
await p.waitForTimeout(800);
console.log(await p.evaluate(process.argv[3]));
await b.close();
await server.close();
process.exit(0);
