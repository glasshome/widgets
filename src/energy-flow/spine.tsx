import { Icon } from "@iconify-icon/solid";
import {
  createEffect,
  createMemo,
  createSignal,
  Index,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { energyColors, energyIcons, type FlowDescription, formatPower } from "../_energy-shared";
import type { EnergyFlow } from "./flow";
import { beamPath, sankeyRibbon } from "./layout";
import type { NodeDetailId } from "./node-detail";

const ACTIVE_THRESHOLD = 50;
/** Spacing between light pulses in the flow stream (user px). The shine
 *  gradient repeats every period, so translating by exactly one period loops
 *  with no visible seam. */
const STREAM_PERIOD = 116;

/** Seconds for a pulse to travel one period. Shared by every ribbon so all
 *  channels flow at one cadence regardless of power. */
const FLOW_DUR = 3.2;

/** Shine animation, inlined so it ships inside the widget JS bundle (extracted
 *  .css files are never loaded by the dashboard). Each ribbon translates its
 *  stream by exactly one period (--ef-travel, signed for flow direction) over
 *  --ef-dur, so the loop is seamless. */
const SHINE_CSS = `
@keyframes ef-flow { to { transform: translateX(var(--ef-travel, 0px)); } }
.ef-shine { animation: ef-flow var(--ef-dur, 3s) linear infinite; will-change: transform; }
@media (prefers-reduced-motion: reduce) { .ef-shine { animation: none; opacity: 0; } }
`;

interface Chip {
  /** Node id for tap-through detail. */
  node: NodeDetailId;
  color: string;
  icon: string;
  label: string;
  value: string;
  /** Power magnitude carried by this chip's beam (W). */
  watts: number;
  /** Idle paths (≤ threshold) render dim and static, chip drops opacity. */
  idle: boolean;
  /** Energy direction along the beam. Sources flow toward the hub; "reverse"
   *  (battery charging) flows hub → chip. Spend always flows hub → chip. */
  reverse: boolean;
}

function socSuffix(soc: number | undefined): string {
  return soc === undefined ? "" : ` · ${Math.round(soc)}%`;
}

/** Left column: solar, battery, grid in fixed order; absent sources collapse. */
function buildSources(flow: EnergyFlow): Chip[] {
  const chips: Chip[] = [];

  if (flow.solar.configured) {
    const idle = flow.solar.watts <= ACTIVE_THRESHOLD;
    chips.push({
      node: "solar",
      color: energyColors.solar,
      icon: energyIcons.solar,
      label: "Solar",
      value: flow.solarSleeping ? "Back at sunrise" : idle ? "idle" : formatPower(flow.solar.watts),
      watts: idle ? 0 : flow.solar.watts,
      idle: idle,
      reverse: false,
    });
  }

  if (flow.battery.configured) {
    const charging = flow.battery.direction === "charge";
    const active = flow.battery.watts > ACTIVE_THRESHOLD && flow.battery.direction !== "idle";
    // Direction reads from the flow animation, not a glyph in the value.
    const value = active ? formatPower(flow.battery.watts) : "idle";
    chips.push({
      node: "battery",
      color: energyColors.battery,
      icon: energyIcons.battery,
      label: `Battery${socSuffix(flow.battery.soc)}`,
      value,
      watts: active ? flow.battery.watts : 0,
      idle: !active,
      reverse: charging,
    });
  }

  if (flow.grid.configured) {
    const importing = flow.grid.direction === "import";
    const exporting = flow.grid.direction === "export";
    const active = flow.grid.watts > ACTIVE_THRESHOLD && flow.grid.direction !== "idle";
    chips.push({
      node: "grid",
      color: energyColors.grid,
      icon: exporting ? energyIcons.export : energyIcons.grid,
      label: importing ? "From grid" : exporting ? "To grid" : "Grid",
      value: active ? formatPower(flow.grid.watts) : "idle",
      watts: active ? flow.grid.watts : 0,
      idle: !active,
      // Export flows home → grid (away from the hub).
      reverse: exporting,
    });
  }

  return chips;
}

/** Right column: EV (when configured) + rest of home (always when home known). */
function buildSpend(flow: EnergyFlow): Chip[] {
  const chips: Chip[] = [];
  const evConfigured = flow.ev.configured;

  if (evConfigured) {
    const idle = flow.ev.watts <= ACTIVE_THRESHOLD;
    chips.push({
      node: "ev",
      color: energyColors.ev,
      icon: energyIcons.ev,
      label: `EV charging${socSuffix(flow.ev.soc)}`,
      value: idle ? "idle" : formatPower(flow.ev.watts),
      watts: idle ? 0 : flow.ev.watts,
      idle,
      reverse: false,
    });
  }

  if (flow.home.configured) {
    // Home consumption includes the EV; the rest-of-home chip subtracts it so
    // the spend side balances the sources side on screen.
    const rest = evConfigured ? Math.max(0, flow.home.watts - flow.ev.watts) : flow.home.watts;
    chips.push({
      node: "home",
      color: energyColors.home,
      icon: energyIcons.home,
      label: evConfigured ? "Rest of home" : "Home",
      value: formatPower(rest),
      watts: rest,
      idle: rest <= ACTIVE_THRESHOLD,
      reverse: false,
    });
  }

  return chips;
}

/** One resolved beam: a Sankey ribbon (active) or a thin hint line (idle),
 *  with the SVG path and gradient endpoints already computed from live flow. */
interface BeamSpec {
  key: string;
  side: "source" | "spend";
  color: string;
  idle: boolean;
  /** Path string: a filled ribbon when active, a centerline when idle. */
  d: string;
  /** Horizontal gradient endpoints (source-color → home-color). */
  gx0: number;
  gx1: number;
  gy: number;
  /** Flow-stream animation (active ribbons only). The stream rect spans
   *  [shineX, shineX+shineW] (one period of overscan each side), travels one
   *  signed period, and repeats every dur seconds. */
  shineX?: number;
  shineW?: number;
  travel?: number;
  dur?: number;
}

interface BeamProps {
  spec: BeamSpec;
  gradId: string;
}

function Beam(props: BeamProps): JSX.Element {
  return (
    <path
      d={props.spec.d}
      fill={props.spec.idle ? "none" : `url(#${props.gradId})`}
      stroke={props.spec.idle ? props.spec.color : "none"}
      stroke-width={props.spec.idle ? 3 : 0}
      stroke-linecap="round"
      opacity={props.spec.idle ? 0.18 : 0.72}
    />
  );
}

interface ChipBoxProps {
  chip: Chip;
  align: "left" | "right";
  onTap: (id: NodeDetailId) => void;
  ref: (el: HTMLButtonElement) => void;
}

function ChipBox(props: ChipBoxProps): JSX.Element {
  // Solid theme surface (matches the dashboard's sub-cards): bg-card, themed
  // border + radius. The role color is carried by the glyph only.
  const glyphColor = () => (props.chip.idle ? "currentColor" : props.chip.color);

  return (
    <button
      ref={props.ref}
      type="button"
      class="flex min-h-[44px] w-full items-center rounded-lg border border-border bg-card text-left transition-opacity"
      style={{
        gap: "clamp(8px, 1.3cqi, 12px)",
        padding: "clamp(8px, 1.4cqi, 14px) clamp(9px, 1.5cqi, 14px)",
      }}
      classList={{
        "opacity-50": props.chip.idle,
        "flex-row-reverse text-right": props.align === "right",
      }}
      aria-label={`${props.chip.label}, ${props.chip.value}`}
      on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
      on:click={() => props.onTap(props.chip.node)}
    >
      <Icon
        icon={props.chip.icon}
        class="shrink-0"
        style={{ color: glyphColor(), "font-size": "clamp(20px, 3.2cqi, 30px)" }}
      />
      <span class="flex min-w-0 flex-col leading-tight">
        <span
          class="truncate text-foreground/55"
          style={{ "font-size": "clamp(11px, 1.7cqi, 14px)" }}
        >
          {props.chip.label}
        </span>
        <span
          class="truncate font-semibold tabular-nums text-foreground"
          style={{ "font-size": "clamp(15px, 2.7cqi, 23px)" }}
        >
          {props.chip.value}
        </span>
      </span>
    </button>
  );
}

/** A chip's measured inner-edge anchor (stage-local px). */
interface ChipGeom {
  node: NodeDetailId;
  side: "source" | "spend";
  /** Inner edge x (right edge for sources, left edge for spends). */
  x: number;
  /** Vertical center. */
  y: number;
  /** Chip height (caps the ribbon's chip-end width). */
  h: number;
}

/** The house hub's measured box. Ribbons stack along its left/right edges. */
interface HubBox {
  left: number;
  right: number;
  top: number;
  bottom: number;
  midY: number;
}

/** Measured layout: stage size + hub box + chip anchors. Recomputed only on
 *  resize or chip add/remove, never on value ticks, so beams don't jitter. */
interface Anchors {
  width: number;
  height: number;
  hub: HubBox;
  chips: ChipGeom[];
}

export function Spine(props: {
  flow: EnergyFlow;
  description: FlowDescription;
  onTap: (id: NodeDetailId) => void;
}): JSX.Element {
  const sources = createMemo(() => buildSources(props.flow));
  const spend = createMemo(() => buildSpend(props.flow));

  // Dominant active source tints the radial glow behind the hub.
  const hubGlow = createMemo(() => {
    const top = sources()
      .filter((c) => !c.idle)
      .sort((a, b) => b.watts - a.watts)[0];
    return top ? top.color : energyColors.home;
  });

  let stageEl: HTMLDivElement | undefined;
  let hubEl: HTMLDivElement | undefined;
  const sourceEls = new Map<string, HTMLButtonElement>();
  const spendEls = new Map<string, HTMLButtonElement>();

  const [anchors, setAnchors] = createSignal<Anchors | null>(null);

  function vCenter(rect: DOMRect, base: DOMRect): number {
    return rect.top - base.top + rect.height / 2;
  }

  // Live beams: stack the active flows into proportional Sankey ribbons along
  // the hub edges from the rarely-measured geometry + current flow. Value ticks
  // recompute this cheaply with no DOM read, so nothing jitters.
  const beams = createMemo<BeamSpec[]>(() => {
    const a = anchors();
    if (!a) return [];
    const byNode = new Map<string, Chip>();
    for (const c of sources()) byNode.set(c.node, c);
    for (const c of spend()) byNode.set(c.node, c);

    const out: BeamSpec[] = [];
    // Chips arrive top→bottom; every flow gets a hub lane stacked in that same
    // order, so ribbons (and idle hint lines) never cross. Active lanes are
    // power-proportional; idle flows reserve a thin lane and route to its
    // center instead of all collapsing onto the hub midpoint.
    const IDLE_LANE = 6;
    // Active ribbons tuck under the (opaque) chip so the seam reads as one
    // continuous flow with no hairline gap. Idle lines stay flush at the edge.
    const CHIP_OVERLAP = 6;
    const buildSide = (side: "source" | "spend", hubX: number) => {
      const live = a.chips
        .filter((g) => g.side === side)
        .map((g) => ({ g, chip: byNode.get(g.node) }))
        .filter((x): x is { g: ChipGeom; chip: Chip } => Boolean(x.chip));
      const isIdle = (chip: Chip) => chip.idle || chip.watts <= 0;
      const activeWatts =
        live.reduce((s, x) => s + (isIdle(x.chip) ? 0 : x.chip.watts), 0) || 1;
      // One width per flow, used at BOTH ends so the ribbon is constant-width
      // (a true Sankey flow, not a funnel). Active widths share 80% of the hub
      // edge by power, capped to the chip's straight edge (inside its rounded
      // corners) so the ribbon butts flush instead of clipping the corner; idle
      // flows reserve a thin lane and render as a hint line.
      const fullH = (a.hub.bottom - a.hub.top) * 0.8;
      const widthOf = ({ g, chip }: { g: ChipGeom; chip: Chip }) =>
        isIdle(chip) ? IDLE_LANE : Math.min((chip.watts / activeWatts) * fullH, g.h - 18);
      // Stack all flows in chip order, centered on the hub, so nothing crosses.
      const totalStack = live.reduce((s, x) => s + widthOf(x), 0);
      let cursor = a.hub.midY - totalStack / 2;
      for (const { g, chip } of live) {
        const key = `${side}-${g.node}`;
        const w = widthOf({ g, chip });
        const laneTop = cursor;
        const laneBot = cursor + w;
        const laneMid = cursor + w / 2;
        cursor += w;
        if (isIdle(chip)) {
          // Thin hint line, chip center → its hub lane center.
          const from = side === "source" ? { x: g.x, y: g.y } : { x: hubX, y: laneMid };
          const to = side === "source" ? { x: hubX, y: laneMid } : { x: g.x, y: g.y };
          out.push({
            key,
            side,
            color: chip.color,
            idle: true,
            d: beamPath(from, to),
            gx0: from.x,
            gx1: to.x,
            gy: g.y,
          });
          continue;
        }
        // Constant-width ribbon: same height w at the chip (centered on it) and
        // at the hub (its stacked lane). Tucks under the chip for a seamless seam.
        const cx = side === "source" ? g.x - CHIP_OVERLAP : g.x + CHIP_OVERLAP;
        const d =
          side === "source"
            ? sankeyRibbon(cx, g.y - w / 2, g.y + w / 2, hubX, laneTop, laneBot)
            : sankeyRibbon(hubX, laneTop, laneBot, cx, g.y - w / 2, g.y + w / 2);
        // Stream flows in the real direction: chip→hub for sources, but hub→chip
        // when the source is reverse (battery charging, grid export); spend
        // always flows hub→chip. One period of overscan each side keeps the
        // ribbon covered through the whole one-period translate.
        const forward = side === "source" ? !chip.reverse : true;
        const xL = Math.min(g.x, hubX);
        const xR = Math.max(g.x, hubX);
        out.push({
          key,
          side,
          color: chip.color,
          idle: false,
          d,
          gx0: side === "source" ? g.x : hubX,
          gx1: side === "source" ? hubX : g.x,
          gy: g.y,
          shineX: xL - STREAM_PERIOD,
          shineW: xR - xL + STREAM_PERIOD * 2,
          travel: (forward ? 1 : -1) * STREAM_PERIOD,
          dur: FLOW_DUR,
        });
      }
    };
    buildSide("source", a.hub.left);
    buildSide("spend", a.hub.right);
    return out;
  });

  function measure(): void {
    const stage = stageEl;
    const hub = hubEl;
    if (!stage || !hub) return;
    const base = stage.getBoundingClientRect();
    if (base.width === 0 || base.height === 0) return;
    const hubRect = hub.getBoundingClientRect();
    const round = (n: number): number => Math.round(n);
    // Ribbons meet the house slightly inside its edges (it sits above the SVG).
    const HUB_INSET = 10;
    // Beams join the chip's exact inner edge. Any positive inset tucks beam
    // under the chip, which shows through the translucent idle chips.
    const CHIP_INSET = 0;
    const hubBox: HubBox = {
      left: round(hubRect.left - base.left + HUB_INSET),
      right: round(hubRect.right - base.left - HUB_INSET),
      top: round(hubRect.top - base.top),
      bottom: round(hubRect.bottom - base.top),
      midY: round(vCenter(hubRect, base)),
    };

    const chips: ChipGeom[] = [];
    for (const chip of sources()) {
      const el = sourceEls.get(chip.node);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      chips.push({
        node: chip.node,
        side: "source",
        x: round(rect.right - base.left - CHIP_INSET),
        y: round(vCenter(rect, base)),
        h: round(rect.height),
      });
    }
    for (const chip of spend()) {
      const el = spendEls.get(chip.node);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      chips.push({
        node: chip.node,
        side: "spend",
        x: round(rect.left - base.left + CHIP_INSET),
        y: round(vCenter(rect, base)),
        h: round(rect.height),
      });
    }

    setAnchors({ width: round(base.width), height: round(base.height), hub: hubBox, chips });
  }

  let ro: ResizeObserver | undefined;
  // Observe stage + every chip + hub: async glyph load and cqi-clamp settling
  // resize the chips without resizing the stage, which would otherwise leave
  // anchors pinned to the chips' initial positions (detached ports).
  function observeAll(): void {
    if (!ro) return;
    ro.disconnect();
    if (stageEl) ro.observe(stageEl);
    if (hubEl) ro.observe(hubEl);
    for (const el of sourceEls.values()) ro.observe(el);
    for (const el of spendEls.values()) ro.observe(el);
  }

  onMount(() => {
    if (typeof ResizeObserver === "undefined") {
      measure();
      return;
    }
    ro = new ResizeObserver(() => measure());
    observeAll();
    requestAnimationFrame(() => measure());
    onCleanup(() => ro?.disconnect());
  });

  // Re-measure + re-observe only when the chip SET changes (add/remove), not on
  // value ticks: tracking the node-id signature keeps measure off the hot path.
  const membership = createMemo(
    () => `${sources().map((c) => c.node).join(",")}|${spend().map((c) => c.node).join(",")}`,
  );
  createEffect(() => {
    membership();
    if (typeof requestAnimationFrame !== "undefined") {
      requestAnimationFrame(() => {
        observeAll();
        measure();
      });
    }
  });

  return (
    <div
      class="flex h-full w-full flex-col gap-3"
      style={{ padding: "var(--widget-pad)" }}
    >
      <div class="flex min-w-0 flex-col leading-tight">
        <span
          class="truncate font-semibold text-foreground"
          style={{ "font-size": "clamp(15px, 2.4cqi, 21px)" }}
        >
          {props.description.headline}
        </span>
        <Show when={props.description.detail}>
          <span
            class="truncate text-foreground/60"
            style={{ "font-size": "clamp(11px, 1.7cqi, 14px)" }}
          >
            {props.description.detail}
          </span>
        </Show>
      </div>

      <div
        ref={stageEl}
        class="relative grid min-h-0 flex-1 items-stretch gap-3"
        style={{ "grid-template-columns": "auto minmax(48px, 1fr) auto" }}
      >
        {/* Left: source chips. Chips stay narrow so the middle corridor keeps
            the horizontal run the beams need to read as flow. */}
        <div class="relative z-[1] flex w-[clamp(152px,28cqi,250px)] flex-col justify-center" style={{ gap: "clamp(10px, 2cqi, 18px)" }}>
          <Index each={sources()}>
            {(chip) => (
              <ChipBox
                chip={chip()}
                align="left"
                onTap={props.onTap}
                ref={(el) => sourceEls.set(chip().node, el)}
              />
            )}
          </Index>
        </div>

        {/* Center: translucent house hub carrying total home consumption. */}
        <div class="relative flex items-center justify-center">
          {/* Soft radial glow behind the hub in the dominant source color. */}
          <div
            class="pointer-events-none absolute h-[140%] w-[140%] rounded-full"
            style={{
              background: `radial-gradient(circle, color-mix(in oklch, ${hubGlow()} 8%, transparent) 0%, transparent 70%)`,
              filter: "blur(6px)",
            }}
            aria-hidden="true"
          />
          <div
            ref={hubEl}
            class="relative z-[1] flex flex-col items-center justify-center gap-1 rounded-2xl bg-foreground/[0.06] backdrop-blur-md px-4 py-3"
          >
            <svg
              viewBox="0 0 56 50"
              aria-hidden="true"
              class="block"
              style={{ width: "clamp(40px, 7cqi, 68px)", height: "clamp(36px, 6.3cqi, 61px)" }}
            >
              <path
                d="M28 4 L4 24 V46 H52 V24 Z"
                fill="none"
                stroke="currentColor"
                stroke-width="2.5"
                stroke-linejoin="round"
                class="text-foreground/55"
              />
            </svg>
            <span
              class="font-semibold tabular-nums text-foreground"
              style={{ "font-size": "clamp(15px, 2.7cqi, 23px)" }}
            >
              {formatPower(props.flow.home.watts)}
            </span>
          </div>
        </div>

        {/* Right: spend chips. */}
        <div class="relative z-[1] flex w-[clamp(152px,28cqi,250px)] flex-col justify-center" style={{ gap: "clamp(10px, 2cqi, 18px)" }}>
          <Index each={spend()}>
            {(chip) => (
              <ChipBox
                chip={chip()}
                align="right"
                onTap={props.onTap}
                ref={(el) => spendEls.set(chip().node, el)}
              />
            )}
          </Index>
        </div>

        {/* Measured SVG overlay: beams connecting chip edges to the hub. */}
        <Show when={anchors()}>
          {(a) => (
            <svg
              viewBox={`0 0 ${a().width} ${a().height}`}
              width={a().width}
              height={a().height}
              class="pointer-events-none absolute inset-0"
              aria-hidden="true"
            >
              <style>{SHINE_CSS}</style>
              <defs>
                {/* Flow stream: one soft pulse per period, tiled. userSpaceOnUse
                    + repeat means a one-period translate loops seamlessly. */}
                <linearGradient
                  id="ef-stream"
                  x1="0"
                  y1="0"
                  x2={`${STREAM_PERIOD}`}
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                  spreadMethod="repeat"
                >
                  <stop offset="0" stop-color="#fff" stop-opacity="0" />
                  <stop offset="0.42" stop-color="#fff" stop-opacity="0" />
                  <stop offset="0.5" stop-color="#fff" stop-opacity="0.3" />
                  <stop offset="0.58" stop-color="#fff" stop-opacity="0" />
                  <stop offset="1" stop-color="#fff" stop-opacity="0" />
                </linearGradient>
                <Index each={beams()}>
                  {(spec) => (
                    <>
                      <linearGradient
                        id={`ef-${spec().key}`}
                        x1={`${spec().gx0}`}
                        y1={`${spec().gy}`}
                        x2={`${spec().gx1}`}
                        y2={`${spec().gy}`}
                        gradientUnits="userSpaceOnUse"
                      >
                        {/* Each ribbon keeps its own channel hue end-to-end:
                            deep at the node, brightening into the house. No
                            grey home-blend that muddies the color. */}
                        <Show
                          when={spec().side === "source"}
                          fallback={
                            <>
                              <stop offset="0" stop-color={spec().color} stop-opacity="0.62" />
                              <stop offset="1" stop-color={spec().color} stop-opacity="0.92" />
                            </>
                          }
                        >
                          <stop offset="0" stop-color={spec().color} stop-opacity="0.92" />
                          <stop offset="1" stop-color={spec().color} stop-opacity="0.62" />
                        </Show>
                      </linearGradient>
                      <Show when={!spec().idle}>
                        <clipPath id={`ef-clip-${spec().key}`}>
                          <path d={spec().d} />
                        </clipPath>
                      </Show>
                    </>
                  )}
                </Index>
              </defs>
              {/* Index (not For): reuse the same <rect> across power ticks so
                  the CSS flow animation keeps running instead of restarting
                  from frame 0 (which made pulses jump to mid-ribbon). */}
              <Index each={beams()}>
                {(spec) => (
                  <Show
                    when={!spec().idle}
                    fallback={<Beam spec={spec()} gradId={`ef-${spec().key}`} />}
                  >
                    <g clip-path={`url(#ef-clip-${spec().key})`}>
                      <path d={spec().d} fill={`url(#ef-${spec().key})`} opacity="0.8" />
                      <rect
                        class="ef-shine"
                        x={spec().shineX}
                        y="0"
                        width={spec().shineW}
                        height={a().height}
                        fill="url(#ef-stream)"
                        style={{
                          "--ef-travel": `${spec().travel}px`,
                          "--ef-dur": `${spec().dur}s`,
                        }}
                      />
                    </g>
                  </Show>
                )}
              </Index>
            </svg>
          )}
        </Show>
      </div>
    </div>
  );
}
