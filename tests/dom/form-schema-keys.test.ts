import { reservedKeys } from "@glasshome/widget-contract/catalog-reserved";
import type { WidgetDefinition } from "@glasshome/widget-sdk";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

const SRC = join(import.meta.dirname, "..", "..", "src");
const dirs = readdirSync(SRC, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== "common" && !d.name.startsWith("_"))
  .map((d) => d.name)
  .filter((dir) => {
    try {
      readFileSync(join(SRC, dir, "index.tsx"));
      return true;
    } catch {
      return false;
    }
  })
  .sort();

const configKeys = (words: Readonly<Record<string, string>>): string[] =>
  Object.keys(words)
    .filter((key) => key.startsWith("manifest.config."))
    .sort();

describe("the form schema and the manifest", () => {
  test.each(dirs)("%s: the edit tab and the manifest name the same config keys", async (dir) => {
    const module = (await import(`../../src/${dir}/index.tsx`)) as {
      default: WidgetDefinition<Record<string, unknown>>;
    };
    const manifest = JSON.parse(readFileSync(join(SRC, dir, "manifest.json"), "utf-8")) as {
      name: string;
      schema?: object;
    };
    const fromDefinition = reservedKeys({
      name: manifest.name,
      schema: module.default.manifest.schema,
    });
    expect(configKeys(fromDefinition)).toEqual(configKeys(reservedKeys(manifest)));
  });
});
