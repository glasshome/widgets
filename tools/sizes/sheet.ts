import { readdirSync, readFileSync } from "node:fs";
import { chromium } from "playwright";
import { OUT_DIR } from "./out";

const dir = OUT_DIR;
const prefix = process.argv[2] ?? "";
const files = readdirSync(dir).filter((f) => f.startsWith(prefix) && f.endsWith(".png"));
const rows = new Map<number, string[]>();
for (const f of files) {
  const size = f.match(/-(\d+)x(\d+)\.png$/);
  if (!size) continue;
  const h = Number(size[2]);
  rows.set(
    h,
    [...(rows.get(h) ?? []), f].sort(
      (a, b) => Number(a.match(/-(\d+)x/)?.[1]) - Number(b.match(/-(\d+)x/)?.[1]),
    ),
  );
}
const bg = prefix.includes("light")
  ? "linear-gradient(135deg,#e9edf3,#cfd8e3)"
  : "linear-gradient(135deg,#1b2230,#0d1117)";
const html = `<body style="margin:0;background:${bg};font:12px sans-serif;color:#888;padding:20px;width:max-content">${[
  ...rows.keys(),
]
  .sort((a, b) => a - b)
  .map(
    (h) =>
      `<div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">${rows
        .get(h)
        ?.map(
          (f) =>
            `<figure style="margin:0"><img style="display:block" src="data:image/png;base64,${readFileSync(`${dir}/${f}`).toString("base64")}"><figcaption>${f.match(/(\d+x\d+)/)?.[1]}</figcaption></figure>`,
        )
        .join("")}</div>`,
  )
  .join("")}</body>`;
const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
const p = await b.newPage({ viewport: { width: 2400, height: 800 } });
await p.setContent(html);
await p.waitForLoadState("load");
await p.screenshot({ path: `${dir}/sheet-${prefix}.png`, fullPage: true });
await b.close();
