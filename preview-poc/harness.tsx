import type { ReactiveWidgetContext, WidgetDefinition } from "@glasshome/widget-sdk";
import { injectTokens, WidgetCtx } from "@glasshome/widget-sdk";
import { loadDemoData } from "@glasshome/sync-layer";
import { createComponent, ErrorBoundary } from "solid-js";
import { render } from "solid-js/web";
// The real built bundle + its separate CSS asset — the same artifacts the hub
// serves. Rendering these (not the source) keeps previews honest.
// App theme tokens (--radius, --border, --background, …), the same import dash's
// styles.css uses. They land on :root and INHERIT into widget shadow roots
// (custom properties cross the boundary; class rules don't). Without them,
// shadow-side calc(var(--radius)+…) collapses — sharp corners, no border.
import "@glasshome/ui/styles";
import widget from "../dist/light.js";
import cssText from "../dist/light.css?raw";

// Grid geometry mirrored from the dash route (rowHeight 70, margin 16, lg 12
// cols at a 1024px reference container). A preview approximates one dashboard
// width rather than mirroring every breakpoint.
const CONTAINER = 1024;
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

/** Minimal copy of the dash mount recipe (instantiate-widget.ts): closed
    shadow root, adopted widget CSS, WidgetCtx provider, dark mirrored onto the
    host. No perf-blur/a11y override sheet — not needed for a static shot. */
function mount(
  host: HTMLElement,
  def: WidgetDefinition,
  config: Record<string, unknown>,
  ctx: ReactiveWidgetContext,
  dark: boolean,
): void {
  const shadow = host.attachShadow({ mode: "closed" });
  host.classList.toggle("dark", dark);
  injectTokens(shadow);
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(cssText);
  shadow.adoptedStyleSheets = [...shadow.adoptedStyleSheets, sheet];

  render(
    () =>
      createComponent(WidgetCtx.Provider, {
        value: ctx,
        get children() {
          return createComponent(ErrorBoundary, {
            fallback: (err: unknown) => {
              console.error("[harness] widget threw:", err);
              return null;
            },
            get children() {
              return createComponent(def.component, { config });
            },
          });
        },
      }),
    shadow,
  );
}

// Breathing room (theme bg) around the tile in the captured frame.
const PAD = 24;

async function main(): Promise<void> {
  const params = new URLSearchParams(location.search);
  const exIndex = Number(params.get("ex") ?? "0");
  const dark = params.get("theme") === "dark";

  const def = widget as unknown as WidgetDefinition;
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

  await loadDemoData();

  document.body.style.background = "var(--background)";

  const { width, height } = tilePx(example.size);
  const stage = document.getElementById("stage");
  const frame = document.getElementById("frame");
  if (!stage || !frame) return;
  frame.style.padding = `${PAD}px`;
  frame.style.background = "var(--background)";
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;

  const ctx: ReactiveWidgetContext = {
    isEditMode: () => false,
    updateConfig: () => {},
    dimensions: () => ({ width, height }),
  };

  mount(stage, def, example.config as Record<string, unknown>, ctx, dark);

  await document.fonts.ready;
  // Signal to the capture driver that mount + fonts settled.
  document.documentElement.setAttribute("data-harness-ready", "1");
}

void main();
