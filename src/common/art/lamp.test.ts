import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LAMP_KINDS } from "./lamp-kinds";

const sheet = readFileSync(join(import.meta.dir, "lamp.css"), "utf8");

describe("lamp pictures live in the stylesheet", () => {
  it.each(LAMP_KINDS)("%s names a picture that exists", (kind) => {
    const asset = sheet
      .split(`.lamp-art[data-lamp="${kind}"] {`)[1]
      ?.match(/^\s*--lamp-mask: url\("\.\/([a-z/-]+\.webp)"\)/)?.[1];
    expect(asset, `lamp.css paints nothing for ${kind}`).toBeDefined();
    expect(existsSync(join(import.meta.dir, asset ?? ""))).toBe(true);
  });
});
