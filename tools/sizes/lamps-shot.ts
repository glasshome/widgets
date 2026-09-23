import { resolve } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";
import solid from "vite-plugin-solid";
import { OUT_DIR } from "./out";

const server = await createServer({
  root: import.meta.dirname,
  configFile: false,
  logLevel: "error",
  plugins: [solid()],
  server: { fs: { allow: [resolve(import.meta.dirname, "../../../../..")] } },
});
await server.listen();
const base = server.resolvedUrls?.local[0];
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
for (const theme of ["dark", "light"]) {
  const p = await b.newPage({ viewport: { width: 2400, height: 1200 } });
  await p.goto(`${base}lamps.html?theme=${theme}&${process.argv[3] ?? ""}`);
  await p.waitForSelector("html[data-ready]");
  await p.waitForTimeout(1200);
  await p.locator("#stage").screenshot({
    path: `${OUT_DIR}/${process.argv[2]}-${theme}.png`,
  });
}
await b.close();
await server.close();
process.exit(0);
