import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import solid from "vite-plugin-solid";

const widgetDirs = readdirSync(resolve(__dirname, "src")).filter((d) => {
  const dirPath = resolve(__dirname, "src", d);
  return statSync(dirPath).isDirectory() && existsSync(join(dirPath, "index.tsx"));
});

const input: Record<string, string> = {};
for (const dir of widgetDirs) {
  input[dir] = resolve(__dirname, `src/${dir}/index.tsx`);
}

/** Regenerate registry.json after each build (including --watch rebuilds). */
function registryPlugin(): Plugin {
  const srcDir = resolve(__dirname, "src");
  const distDir = resolve(__dirname, "dist");
  return {
    name: "widget-registry",
    closeBundle() {
      const widgets = [];
      for (const dir of readdirSync(srcDir)) {
        if (!statSync(join(srcDir, dir)).isDirectory()) continue;
        const manifestPath = join(srcDir, dir, "manifest.json");
        try {
          const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
          widgets.push({ ...manifest, bundleUrl: `./${dir}.js` });
        } catch {
          // skip dirs without manifest
        }
      }
      const registry = {
        version: 1,
        generatedAt: new Date().toISOString(),
        baseUrl: "./",
        widgets,
      };
      writeFileSync(join(distDir, "registry.json"), JSON.stringify(registry, null, 2));
      console.log(`[registry] Generated registry.json with ${widgets.length} widget(s)`);
    },
  };
}

export default defineConfig({
  plugins: [solid(), registryPlugin()],
  build: {
    rollupOptions: {
      input,
      preserveEntrySignatures: "exports-only",
      external: (id) =>
        id === "solid-js" ||
        id.startsWith("solid-js/") ||
        id === "@glasshome/widget-sdk" ||
        id.startsWith("@glasshome/widget-sdk/") ||
        id === "@glasshome/ui" ||
        id.startsWith("@glasshome/ui/") ||
        id === "@glasshome/sync-layer" ||
        id.startsWith("@glasshome/sync-layer/"),
      output: {
        dir: "dist",
        format: "es",
        entryFileNames: "[name].js",
      },
    },
  },
  preview: {
    port: 5174,
    host: true,
    cors: true,
  },
});
