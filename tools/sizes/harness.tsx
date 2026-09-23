import { callService, claimHostApi, getEntityView } from "@glasshome/sync-layer";
import { byDomain, useAreas, useEntities } from "@glasshome/sync-layer/solid";
import type { EntityDataAdapter } from "@glasshome/ui/solid";
import { provideEntityData, provideIcons } from "@glasshome/ui/solid";
import type { ReactiveWidgetContext, WidgetDefinition } from "@glasshome/widget-sdk";
import { instantiateWidget } from "@glasshome/widget-sdk/host";
import type { IconifyJSON } from "@iconify/types";
import { getIconData } from "@iconify/utils";
// `?url` + runtime fetch, NOT a JSON import. Vite turns an imported JSON file
// into an ES module — a multi-megabyte object literal the JS engine has to
// evaluate on every page load, which cost ~200s per render. Fetching the same
// file and letting the browser JSON.parse it natively is orders of magnitude
// faster, and the request is local so the egress lock still holds.
import lucideUrl from "@iconify-json/lucide/icons.json?url";
import mdiUrl from "@iconify-json/mdi/icons.json?url";
import { addAPIProvider, addCollection } from "iconify-icon";
// The real built bundle + its separate CSS asset — the same artifacts the hub
// serves. Rendering these (not the source) keeps previews honest.
// App theme tokens (--radius, --border, --background, …), the same import dash's
// styles.css uses. They land on :root and INHERIT into widget shadow roots
// (custom properties cross the boundary; class rules don't). Without them,
// shadow-side calc(var(--radius)+…) collapses — sharp corners, no border.
import "@glasshome/ui/styles";
import uiCss from "@glasshome/ui/styles?raw";
// Fonts must load at the document (an @font-face in an adopted/shadow sheet
// won't); the family name then inherits into the widget shadow. Same set dash's
// styles.css loads.
import "@fontsource-variable/geist";
import "@fontsource-variable/geist-mono";
import "@fontsource-variable/caveat";

// Preload every collection into iconify's shared icon storage before any widget
// mounts. `iconify-icon` is a declared singleton host-provided module, so one
// registration serves every widget. Full collections rather than a scanned
// subset, because icon names are built at runtime (weather picks by condition,
// light by on/off) and a static scan misses exactly those. All three prefixes
// are needed: widgets use mdi, but @glasshome/ui components pull lucide.
// (simple-icons is deliberately absent — nothing references it, and at 4.6MB it
// was the single largest cost per page load.)
async function preloadIcons(): Promise<void> {
  const [mdi, lucide] = await Promise.all([
    fetch(mdiUrl).then((r) => r.json() as Promise<IconifyJSON>),
    fetch(lucideUrl).then((r) => r.json() as Promise<IconifyJSON>),
  ]);
  addCollection(mdi);
  addCollection(lucide);
  const sets: Record<string, IconifyJSON> = { mdi, lucide };
  provideIcons({
    bundled: {},
    load: async (names) =>
      Object.fromEntries(
        names.map((n) => {
          const [prefix, name] = n.split(":");
          const set = prefix ? sets[prefix] : undefined;
          return [n, set && name ? getIconData(set, name) : null];
        }),
      ),
  });
}

// No network fallback. Dash repoints this provider at its own /iconify/ proxy;
// the render worker has no egress at all, so an unresolved icon must fail
// visibly (blank) rather than reach out to api.iconify.design.
addAPIProvider("", { resources: [] });

// @glasshome/ui's smart-home components (pickers, entity rows) resolve data
// through an injected adapter; dash binds the same four sync-layer functions in
// main.tsx. Without it those components throw and the widget renders empty.
// Host setup like this is duplicated per host today — see the mount
// consolidation memo.
const entityDataAdapter: EntityDataAdapter = {
  entityIdsByDomain: byDomain,
  useEntities,
  getEntityView,
  useAreas,
};
provideEntityData(entityDataAdapter);

// Every built widget bundle + its CSS, selected by the `?widget=` param. Glob
// keeps the imports static-analyzable while staying widget-agnostic — the same
// real dist artifacts the hub serves.
const bundles = import.meta.glob<{ default: WidgetDefinition }>("../../dist/*.js");
const styles = import.meta.glob<string>("../../dist/*.css", {
  query: "?raw",
  import: "default",
});

async function loadWidget(name: string): Promise<{ def: WidgetDefinition; css: string | null }> {
  const jsKey = `../../dist/${name}.js`;
  const loadJs = bundles[jsKey];
  if (!loadJs) throw new Error(`no built bundle for widget "${name}" (${jsKey})`);
  const def = (await loadJs()).default;
  const loadCss = styles[`../../dist/${name}.css`];
  const css = loadCss ? await loadCss() : null;
  return { def, css };
}

// Grid geometry mirrored from the dash route (rowHeight 70, margin 16, lg 12
// cols at a 1024px reference container). A preview approximates one dashboard
// width rather than mirroring every breakpoint.
// max-w-7xl (1280px) minus the route's px-3 padding, i.e. the width the grid
// actually gets on a desktop dashboard. NOT the lg breakpoint's 1024 minimum:
// that is the narrowest a desktop can be, and using it rendered every
// size-responsive widget one tier below what users see (energy-flow never
// reached its node-graph tier, so the storefront advertised the compact
// layout).
const CONTAINER = 1256;
const COLS = 12;
const GAP = 16;
const ROW_H = 70;
const COL_W = (CONTAINER - GAP * (COLS - 1)) / COLS;

function tilePx(size: { w: number; h: number }): { width: number; height: number } {
  return {
    width: Math.round(COL_W * size.w + GAP * (size.w - 1)),
    height: ROW_H * size.h + GAP * (size.h - 1),
  };
}

/* The shell composites `--glass-frost` as its bottom background layer and
   defaults it to `none`, because in the app a live backdrop-filter blurs the
   dashboard wallpaper behind the widget. A preview is shot alone on a
   transparent page, so there is nothing to blur and the widget would render
   with no surface at all: legible by luck in light mode, white-on-nothing in
   dark. ui registers --glass-frost with `inherits: false`, so it cannot be
   handed down from the host and has to be set on the shell element itself,
   which is what dash's performant-blur override sheet does too.

   `--card` is an ordinary inheriting theme token, so it crosses the shadow
   boundary and follows the `dark` class already mirrored onto the host. */
const FROST_SHEET = new CSSStyleSheet();
FROST_SHEET.replaceSync(
  ".glasshome-widget { --glass-frost: linear-gradient(var(--card), var(--card)); }",
);

/* ui's material lives in class rules (.glass, .glass-tint), and class rules do
   not cross a shadow boundary — only custom properties inherit. Without this,
   every @glasshome/ui component the SDK re-exports renders inside a widget with
   its layout classes but no material. Adopted verbatim: globals.css declares on
   :where(.glass), never :root, so it needs no re-scoping. */
const UI_SHEET = new CSSStyleSheet();
UI_SHEET.replaceSync(uiCss);

/** Mount via the shared SDK recipe (`@glasshome/widget-sdk/host`): closed shadow
    root, injected tokens, adopted widget CSS, WidgetCtx provider, `dark`
    mirrored onto the host. `dark` is the default `mirrorClasses`; the `dark`
    document class is toggled by the caller before this runs. */
function mount(
  host: HTMLElement,
  def: WidgetDefinition,
  config: Record<string, unknown>,
  ctx: ReactiveWidgetContext,
  cssText: string | null,
): void {
  instantiateWidget(host, {
    definition: def,
    config: () => config,
    ctx,
    cssText,
    extraSheets: [UI_SHEET, FROST_SHEET],
    onCrash: (err) => console.error("[harness] widget threw:", err),
  });
}

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const widgetName = params.get("widget") ?? "light";
  const exIndex = Number(params.get("ex") ?? "0");
  const dark = params.get("theme") === "dark";

  const { def, css } = await loadWidget(widgetName);
  const examples = def.manifest.examples ?? [];
  // Publish the shot-list so the capture driver can enumerate without importing
  // the widget's TSX source under a non-Solid JSX runtime.
  document.documentElement.dataset.harnessExamples = JSON.stringify(
    examples.map((e) => ({ label: e.label, size: e.size })),
  );
  const example = examples[exIndex];
  if (!example) {
    document.title = "harness-error: no example";
    return;
  }

  document.documentElement.classList.toggle("dark", dark);

  // Icons must be registered before the widget mounts, or its first paint
  // triggers the (now dead) network lookup and renders blank.
  await preloadIcons();

  // The harness is a host: claim the privileged surface once at boot
  // (sync-layer keeps demo control off the widget-reachable entry).
  const hostApi = claimHostApi();
  if (!hostApi) throw new Error("harness: host API already claimed");
  await hostApi.loadDemoData();
  for (const call of params.getAll("svc")) {
    const [svc, entityId, data] = call.split("|");
    const [domain = "", service = ""] = (svc ?? "").split(".");
    await callService(domain, service, JSON.parse(data ?? "{}"), { entity_id: entityId });
  }

  // Background and padding are the renderer's job: the preview is the widget
  // alone, tight and transparent (omitBackground on capture).
  const px = params.get("pw")
    ? { width: Number(params.get("pw")), height: Number(params.get("ph")) }
    : tilePx(example.size);
  const { width, height } = px;
  const stage = document.getElementById("stage");
  if (!stage) return;
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;

  const ctx: ReactiveWidgetContext = {
    updateConfig: () => {},
    dimensions: () => ({ width, height }),
  };

  const cfg = {
    ...(example.config as Record<string, unknown>),
    ...JSON.parse(params.get("cfg") ?? "{}"),
  };
  mount(stage, def, cfg, ctx, css);

  await document.fonts.ready;
  // Signal to the capture driver that mount + fonts settled.
  document.documentElement.setAttribute("data-harness-ready", "1");
}

void main();
