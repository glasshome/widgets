import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOM_PRESETS, type RoomKind, roomPhotos } from "./room";

const sheet = readFileSync(join(import.meta.dir, "room-art.css"), "utf8");

const paintedBy = (src: string): string | undefined =>
  sheet
    .split(`img[src="${src}"] {`)[1]
    ?.match(/^\s*background-image: url\("\.\/assets\/([a-z-]+\.webp)"\);/)?.[1];

describe("built-in room photos", () => {
  const kinds = Object.keys(ROOM_PRESETS) as RoomKind[];

  it.each(kinds)("%s: each scene's src names a photo the sheet paints", (kind) => {
    const photos = roomPhotos(kind);
    const sources = [photos?.day, photos?.nightOff, photos?.nightOn];
    for (const src of sources) {
      expect(src).toStartWith("data:image/svg+xml,");
      const asset = paintedBy(src ?? "");
      expect(asset, `no rule paints ${src}`).toBeDefined();
      expect(existsSync(join(import.meta.dir, "assets", asset ?? ""))).toBe(true);
    }
    expect(new Set(sources).size).toBe(3);
  });
});
