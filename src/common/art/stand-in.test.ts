import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SAMPLES } from "../../picture-frame/samples";
import curtain from "./assets/cover-curtain.art";
import garage from "./assets/cover-garage.art";
import shutter from "./assets/cover-shutter.art";
import window from "./assets/cover-window.art";
import gate from "./assets/cover-gate.strip";
import doorSwing from "./assets/door-swing.strip";
import windowSash from "./assets/window-sash.strip";
import boltSlide from "../../lock/assets/bolt-slide.strip";
import gateSwing from "../../lock/assets/gate-swing.strip";

const src = (...parts: string[]) => join(import.meta.dir, "..", "..", ...parts);

const paintedBy = (sheet: string, standIn: string): string | undefined =>
  sheet
    .split(`img[src="${standIn}"] {`)[1]
    ?.match(/^\s*background(?:-image)?: url\("\.\/([a-z/-]+\.webp)"\)/)?.[1];

const expectPainted = (sheetPath: string, standIn: string) => {
  const asset = paintedBy(readFileSync(sheetPath, "utf8"), standIn);
  expect(asset, `${sheetPath} paints nothing for ${standIn}`).toBeDefined();
  expect(existsSync(join(dirname(sheetPath), asset ?? ""))).toBe(true);
};

describe("art that left the module for a stylesheet", () => {
  const common = "common/art/assets";
  const arts: [string, { src: string }][] = [
    [`${common}/cover-curtain.art.css`, curtain],
    [`${common}/cover-garage.art.css`, garage],
    [`${common}/cover-shutter.art.css`, shutter],
    [`${common}/cover-window.art.css`, window],
    [`${common}/cover-gate.strip.css`, gate],
    [`${common}/door-swing.strip.css`, doorSwing],
    [`${common}/window-sash.strip.css`, windowSash],
    ["lock/assets/bolt-slide.strip.css", boltSlide],
    ["lock/assets/gate-swing.strip.css", gateSwing],
  ];

  it.each(arts)("%s paints the picture its module names", (sheet, art) => {
    expect(art.src).toStartWith("data:image/svg+xml,");
    expectPainted(src(sheet), art.src);
  });

  it("each picture frame sample's src names a photo the sheet paints", () => {
    const sources = Object.values(SAMPLES).map((sample) => sample.src);
    for (const source of sources) {
      expect(source).toStartWith("data:image/svg+xml,");
      expectPainted(src("picture-frame/sample-art.css"), source);
    }
    expect(new Set(sources).size).toBe(sources.length);
  });
});
