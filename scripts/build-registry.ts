import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const srcDir = resolve(import.meta.dir, "../src");
const distDir = resolve(import.meta.dir, "../dist");

const widgets = [];
for (const dir of readdirSync(srcDir)) {
  if (!statSync(join(srcDir, dir)).isDirectory()) continue;
  const manifestPath = join(srcDir, dir, "manifest.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
    widgets.push({
      ...manifest,
      bundleUrl: `./${dir}.js`,
    });
  } catch {
    console.warn(`Skipping ${dir}: no manifest.json found`);
  }
}

const registry = {
  version: 1,
  generatedAt: new Date().toISOString(),
  baseUrl: "./",
  widgets,
};

writeFileSync(join(distDir, "registry.json"), JSON.stringify(registry, null, 2));
console.log(`Generated registry.json with ${widgets.length} widget(s)`);
