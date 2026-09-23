import { readdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { OUT_DIR } from "./out";

const dir = OUT_DIR;
const [widget, theme, outName] = process.argv.slice(2);
const files = readdirSync(dir).filter(
  (f) => f.startsWith(`${widget}-e`) && f.includes(`-${theme}-`),
);
const rows = new Map<string, string[]>();
for (const f of files) {
  const ex = f.match(/-e(\d+)-/)?.[1];
  if (ex === undefined) continue;
  rows.set(ex, [...(rows.get(ex) ?? []), f].sort());
}
const bg =
  theme === "light"
    ? "linear-gradient(135deg,#e9edf3,#cfd8e3)"
    : "linear-gradient(135deg,#1b2230,#0d1117)";
const html = `<body style="margin:0;background:${bg};padding:20px;width:max-content">${[
  ...rows.keys(),
]
  .sort()
  .map(
    (k) =>
      `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">${rows
        .get(k)
        ?.map(
          (f) =>
            `<img style="display:block" src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString("base64")}">`,
        )
        .join("")}</div>`,
  )
  .join("")}</body>`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 1600, height: 800 } });
await p.setContent(html);
await p.waitForLoadState("load");
await p.screenshot({
  path: `${OUT_DIR}/${outName}.png`,
  fullPage: true,
});
await b.close();
