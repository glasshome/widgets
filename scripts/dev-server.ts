import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const distDir = resolve(import.meta.dir, "../dist");
const PORT = 5174;
const API_URL = process.env.API_URL ?? "http://localhost:3333";

const server = Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const pathname = url.pathname === "/" ? "/registry.json" : url.pathname;
    const filePath = join(distDir, pathname.slice(1));

    if (!filePath.startsWith(distDir)) {
      return new Response("Forbidden", { status: 403 });
    }

    if (existsSync(filePath) && statSync(filePath).isFile()) {
      const contentType = filePath.endsWith(".js")
        ? "application/javascript"
        : filePath.endsWith(".json")
          ? "application/json"
          : "application/octet-stream";

      return new Response(Bun.file(filePath), {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Widget dev server running at http://localhost:${server.port}/`);

const registryPath = resolve(distDir, "registry.json");
if (existsSync(registryPath)) {
  const registry = JSON.parse(readFileSync(registryPath, "utf-8"));
  const baseUrl = `http://localhost:${server.port}`;

  for (const widget of registry.widgets ?? []) {
    const bundleUrl = widget.bundleUrl.startsWith(".")
      ? `${baseUrl}/${widget.bundleUrl.replace("./", "")}`
      : widget.bundleUrl;

    try {
      const res = await fetch(`${API_URL}/trpc/widget.register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: widget.tag,
          name: widget.name,
          version: widget.version,
          bundleUrl,
          manifestJson: JSON.stringify(widget),
        }),
      });

      if (res.ok) {
        console.log(`  Registered: ${widget.tag} -> ${bundleUrl}`);
      } else {
        console.warn(`  Failed to register ${widget.tag}: ${res.status}`);
      }
    } catch (err) {
      console.warn(`  Could not reach API to register ${widget.tag}: ${err}`);
    }
  }
} else {
  console.warn("No registry.json found in dist/ — run build first");
}

await new Promise(() => {});
