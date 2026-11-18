import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { scenePhotos } from "../../src/weather/sky";

const dir = join(__dirname, "../../src/weather");
const sheet = readFileSync(join(dir, "land-art.css"), "utf8");

const paintedBy = (src: string): string | undefined =>
  sheet
    .split(`img[src="${src}"] {`)[1]
    ?.match(/^\s*background-image: url\("\.\/assets\/([a-z-]+\.webp)"\);/)?.[1];

describe("weather land photos", () => {
  const scenes = [
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ] as const;

  test.each(scenes)(
    "wintry %s, night %s: land and near name photos the sheet paints",
    (wintry, night) => {
      const photos = scenePhotos("sunny", wintry, night);
      for (const src of [photos.land, photos.near]) {
        expect(src).toMatch(/^data:image\/svg\+xml,/);
        const asset = paintedBy(src);
        expect(asset, `no rule paints ${src}`).toBeDefined();
        expect(existsSync(join(dir, "assets", asset ?? ""))).toBe(true);
      }
      expect(photos.land).not.toBe(photos.near);
    },
  );
});
