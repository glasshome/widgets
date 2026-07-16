import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

/**
 * The Playwright-downloaded Chromium ships a glibc dynamic linker
 * (`/lib64/ld-linux-x86-64.so.2`) and expects system libs (glib, nss, X11, …)
 * that do not exist on NixOS, so it dies with `libglib-2.0.so.0: cannot open
 * shared object file`. NixOS's nix-ld provides the interpreter shim via
 * `NIX_LD`; it just needs a library search path. This harvests that path from
 * the installed nix Chromium's runtime closure — version-independent and
 * offline — so the downloaded browser resolves every lib.
 *
 * Returns the `:`-joined path (existing `NIX_LD_LIBRARY_PATH` prepended), or
 * null when not on NixOS or no nix Chromium is installed (caller should then
 * launch normally).
 */
export function nixLdLibraryPath(): string | null {
  if (!existsSync("/etc/NIXOS")) return null;

  let chromePath: string;
  try {
    chromePath = execFileSync("bash", ["-lc", 'readlink -f "$(command -v chromium)"'], {
      encoding: "utf-8",
    }).trim();
  } catch {
    return null;
  }
  if (!chromePath || !existsSync(chromePath)) return null;

  let closure: string[];
  try {
    closure = execFileSync("nix-store", ["-qR", chromePath], { encoding: "utf-8" })
      .split("\n")
      .filter(Boolean);
  } catch {
    return null;
  }

  const dirs: string[] = [];
  for (const p of closure) {
    for (const sub of [`${p}/lib`, `${p}/lib64`]) {
      if (existsSync(sub)) dirs.push(sub);
    }
  }
  if (dirs.length === 0) return null;

  const existing = process.env.NIX_LD_LIBRARY_PATH;
  return existing ? `${existing}:${dirs.join(":")}` : dirs.join(":");
}
