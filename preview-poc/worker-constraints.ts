import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import type { Browser, Page } from "playwright";
import { chromium } from "playwright";
import { nixLdLibraryPath } from "./nix-ld";

/**
 * Local rehearsal of the render worker's runtime constraints.
 *
 * The worker will execute attacker-controlled widget code on hub infra with no
 * consent gate, so the screenshot itself is a potential exfiltration channel: a
 * widget could fetch an internal endpoint and paint the response. Imposing the
 * same constraints on the local harness answers "can widgets even render like
 * this?" before any infrastructure exists.
 */

/** Hard wall-clock cap per render. A widget that hangs (camera waiting on a
    stream that will never arrive) must be killed, not allowed to stall the run. */
export const RENDER_TIMEOUT_MS = 30_000;

export interface EgressLock {
  /**
   * Every non-local URL the page ATTEMPTED to reach. These were all blocked by
   * the DNS blackhole, so nothing actually left the machine — this records
   * intent, not leakage.
   *
   * A non-empty list is still a finding: it names what a widget needs from the
   * network and therefore what it must degrade gracefully without.
   */
  readonly attempts: string[];
}

/**
 * Chromium launch flags that blackhole DNS for everything except localhost.
 *
 * Enforcement lives at the browser, not in Playwright's request interception.
 * Registering any `page.route` makes Playwright intercept EVERY request and
 * round-trip it through Node — with multi-megabyte icon collections on the page
 * that is pathologically slow. Resolver rules cost nothing at runtime and are a
 * closer analogue of the container egress allowlist the worker will actually
 * rely on.
 */
export const NO_EGRESS_ARGS = [
  "--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost",
];

/**
 * Record (do not intercept) every non-local request the page attempts.
 *
 * Passive listeners, so no proxying overhead. The DNS blackhole above does the
 * blocking; this only answers "what did it try to reach?".
 */
export function watchEgress(page: Page, allowedOrigin: string): EgressLock {
  const attempts: string[] = [];

  const isLocal = (href: string): boolean =>
    href.startsWith(allowedOrigin) ||
    href.startsWith("data:") ||
    href.startsWith("blob:") ||
    href.startsWith("about:") ||
    href.startsWith("chrome-extension:");

  page.on("request", (req) => {
    const url = req.url();
    if (!isLocal(url)) attempts.push(url);
  });

  return { attempts };
}

/**
 * Hash the exact bytes about to be rendered.
 *
 * Rehearses the worker's verify-before-execute rule (S6c). In production the
 * hub pins a bundle's hash at publish time, but the author's presigned upload
 * URL stays valid for another 300s — so the object in storage can be swapped
 * after verification. The worker must therefore render the bytes the hub
 * pinned, not whatever a re-fetch returns. Locally this proves the plumbing:
 * hash both artifacts, and refuse to render if they don't match what was
 * recorded when the shot list was built.
 */
export function hashWidgetArtifacts(distDir: string, widget: string): string {
  const hash = createHash("sha256");
  for (const file of [`${distDir}/${widget}.js`, `${distDir}/${widget}.css`]) {
    // CSS is optional — a widget that ships no stylesheet is legitimate.
    if (existsSync(file)) hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

/**
 * Fixed wall-clock instant every render starts from: a bright weekday midday, so
 * time-of-day-dependent widgets (clock, weather, sun-driven energy) land in a
 * flattering, stable state instead of drifting with the run.
 */
export const FROZEN_TIME = new Date("2026-06-15T12:34:00Z");

/**
 * Freeze time, then step it forward deliberately.
 *
 * Widgets gate their mount animation behind `requestAnimationFrame(() =>
 * setMounted(true))` (sensor/sparkline.tsx, weather/forecast-chart.tsx). A
 * fully paused clock never fires that callback, so those widgets would be
 * screenshotted in their pre-mount state — or wait forever and die to the
 * timeout. Installing the clock and then running it forward a short, fixed
 * amount fires the rAF callbacks and any mount transition, while keeping the
 * result byte-identical between runs.
 */
export async function freezeClock(page: Page): Promise<void> {
  await page.clock.install({ time: FROZEN_TIME });
}

/** Advance the frozen clock enough to settle rAF-gated mount animations. */
export async function settleAnimations(page: Page, ms = 1_000): Promise<void> {
  await page.clock.runFor(ms);
}

/** Reject if a render exceeds the cap, so a hang surfaces as a failure rather
    than a stalled run. */
export async function withRenderTimeout<T>(
  label: string,
  fn: () => Promise<T>,
  ms: number = RENDER_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`render timeout after ${ms}ms: ${label}`)), ms);
  });
  try {
    return await Promise.race([fn(), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Apply the nix-ld library path exactly once. `nixLdLibraryPath()` prepends the
    existing value, so calling it per launch would grow the variable on every
    render until the child's environment blows past the exec limit (E2BIG). */
let nixLdApplied = false;
function applyNixLdOnce(): void {
  if (nixLdApplied) return;
  nixLdApplied = true;
  const nixLd = nixLdLibraryPath();
  if (nixLd) process.env.NIX_LD_LIBRARY_PATH = nixLd;
}

/** Launch one browser and hand out a fresh context (own cache and storage) per
    render. Enough isolation for the egress question, without paying a process
    launch per shot. */
export async function withSharedBrowser<T>(
  fn: (newPage: () => Promise<Page>) => Promise<T>,
): Promise<T> {
  applyNixLdOnce();

  // Recycle the process every N pages. Each render pulls megabytes of icon data
  // into a fresh context, and a single long-lived browser died around the
  // twentieth — after which every later newContext() fails instantly with
  // "Target page, context or browser has been closed", turning one crash into a
  // cascade of phantom failures.
  const PAGES_PER_BROWSER = 8;

  const launch = () => chromium.launch({ args: NO_EGRESS_ARGS });
  let browser = await launch();
  let served = 0;

  const newPage = async (): Promise<Page> => {
    // Recycle on the counter, but also whenever the browser died on its own —
    // a crashed process keeps `served` below the limit, so counting alone lets
    // every later newContext() fail and turns one crash into a run of phantom
    // failures.
    if (served >= PAGES_PER_BROWSER || !browser.isConnected()) {
      if (browser.isConnected()) await browser.close();
      browser = await launch();
      served = 0;
    }
    served++;
    try {
      const context = await browser.newContext({ deviceScaleFactor: 2 });
      return await context.newPage();
    } catch {
      // Lost between the liveness check and the context: relaunch once so the
      // crash costs one render rather than the rest of the pass.
      browser = await launch();
      served = 1;
      const context = await browser.newContext({ deviceScaleFactor: 2 });
      return context.newPage();
    }
  };

  try {
    return await fn(newPage);
  } finally {
    await browser.close().catch(() => {});
  }
}

/**
 * Fresh browser process per render.
 *
 * The worker must not reuse a process across widgets — one widget's residue
 * (globals, caches, service workers) must never reach another's shot.
 */
export async function withFreshBrowser<T>(fn: (page: Page, browser: Browser) => Promise<T>): Promise<T> {
  // On NixOS the Playwright-downloaded Chromium can't find its system libs;
  // point nix-ld at them so the bundled browser launches unmodified.
  applyNixLdOnce();

  const browser = await chromium.launch({ args: NO_EGRESS_ARGS });
  try {
    const context = await browser.newContext({ deviceScaleFactor: 2 });
    const page = await context.newPage();
    return await fn(page, browser);
  } finally {
    await browser.close();
  }
}
