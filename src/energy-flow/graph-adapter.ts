/**
 * The seam between config and rendering: resolves the user-defined node list
 * into a `ResolvedFlow` (per-node power, direction, remainder math) and maps
 * that onto the domain-agnostic flow-graph model — source/spend nodes around a
 * central hub, one ribbon per flow. This is the ONLY runtime module that knows
 * the config's node field names. Pure — no SolidJS, no DOM.
 */

// Leaf imports (not the _energy-shared barrel): the barrel pulls JSX modules
// (icons/empty-state), which break bun's server-side test transpile.
import { type BidirectionalInput, normalizeBidirectional } from "../_energy-shared/calculations";
import { energyColors } from "../_energy-shared/colors";
import { formatPower } from "../_energy-shared/formatting";
import { energyIcons } from "../_energy-shared/icons";
import type { FlowEdge, FlowGraph, FlowNode } from "../_flow-graph/types";
import { computeCost, gridCostSub, solarSavingSub, type Tariff } from "./cost";
import {
  ACTIVE_THRESHOLD,
  type FlowDirection,
  type ResolvedFlow,
  type ResolvedNode,
  toFlowState,
} from "./flow";
import type { BidirectionalNodeConfig, FlowNodeConfig } from "./node-model";

export type PowerLookup = (entityId: string) => number | null;

// Inverters report a few watts of standby draw at night, so an exact <= 0 test
// almost never fires. Treat anything at or below this as "resting".
const SLEEP_THRESHOLD_W = 20;

/** Hub-end fade for a ribbon: its own color receding toward the theme
 *  background, so the flow quiets down as it reaches the house in either
 *  theme. Staying on one hue per ribbon matters: SVG gradients interpolate in
 *  sRGB, and blending two distant hues (e.g. solar amber into a shared blue)
 *  passes near gray and reads muddy. */
function hubFade(color: string): string {
  return `color-mix(in oklch, ${color} 55%, var(--background, transparent))`;
}

const FALLBACK_LABELS: Record<FlowNodeConfig["kind"], string> = {
  input: "Input",
  output: "Output",
  bidirectional: "Two-way",
};

const FALLBACK_ICONS: Record<FlowNodeConfig["kind"], string> = {
  input: "mdi:lightning-bolt",
  output: "mdi:power-plug",
  bidirectional: "mdi:swap-horizontal",
};

// Deterministic per-kind palettes so migrated configs keep their old role
// colors (solar amber first input, home purple first output, battery green
// unpriced two-way, grid blue priced two-way).
const INPUT_COLORS = [energyColors.solar, energyColors.ev, energyColors.export, energyColors.home];
const OUTPUT_COLORS = [energyColors.home, energyColors.ev, energyColors.export, energyColors.solar];
const STORAGE_COLORS = [energyColors.battery, energyColors.grid, energyColors.export];

function cycle(palette: readonly string[], index: number): string {
  return palette[index % palette.length] ?? energyColors.home;
}

function first(ids: readonly string[]): string | undefined {
  return ids.length > 0 ? ids[0] : undefined;
}

/** Every entity ID a node list references (level sensors included). */
export function configEntityIds(nodes: readonly FlowNodeConfig[]): string[] {
  const ids: string[] = [];
  for (const node of nodes) {
    if (node.kind === "bidirectional") {
      ids.push(...node.positive, ...node.negative, ...node.signed);
    } else {
      ids.push(...node.entities);
    }
    ids.push(...node.level);
  }
  return ids.filter((id) => id.length > 0);
}

interface Resolved {
  watts: number;
  stale: boolean;
  configured: boolean;
}

// Sum several sensors into one node (e.g. multiple solar arrays/inverters).
// Any unavailable member marks the node stale; its share reads as 0.
function resolveSum(ids: readonly string[], lookup: PowerLookup): Resolved {
  if (ids.length === 0) return { watts: 0, stale: false, configured: false };
  let watts = 0;
  let stale = false;
  for (const id of ids) {
    const v = lookup(id);
    if (v === null) stale = true;
    else watts += v;
  }
  return { watts: Math.max(0, watts), stale, configured: true };
}

// Avoids re-warning on every reactive tick when both signed and dual are set.
const warnedBothModes = new Set<string>();

/**
 * Resolve a two-way node (dual sensors OR a single signed sensor).
 * Precedence is intentional: a configured signed sensor wins and the dual
 * sensors are ignored. Configuring both is a user mistake, so warn once.
 */
function resolveBidirectional(
  node: BidirectionalNodeConfig,
  lookup: PowerLookup,
): { inW: number; outW: number; stale: boolean; configured: boolean } {
  const posId = first(node.positive);
  const negId = first(node.negative);
  const signedId = first(node.signed);
  if (signedId && (posId || negId) && !warnedBothModes.has(signedId)) {
    warnedBothModes.add(signedId);
    console.warn(
      `energy-flow: both a signed sensor (${signedId}) and directional sensors are configured for the same node; the signed sensor wins and the directional sensors are ignored.`,
    );
  }
  if (signedId) {
    const v = lookup(signedId);
    if (v === null) return { inW: 0, outW: 0, stale: true, configured: true };
    const input: BidirectionalInput = { signed: node.signedOutbound ? -v : v };
    const n = normalizeBidirectional(input);
    return { inW: n.import, outW: n.export, stale: false, configured: true };
  }
  if (posId || negId) {
    const pos = posId ? lookup(posId) : 0;
    const neg = negId ? lookup(negId) : 0;
    const stale = pos === null || neg === null;
    const input: BidirectionalInput = { importValue: pos ?? 0, exportValue: neg ?? 0 };
    const n = normalizeBidirectional(input);
    return { inW: n.import, outW: n.export, stale, configured: true };
  }
  return { inW: 0, outW: 0, stale: false, configured: false };
}

function resolveLevel(node: FlowNodeConfig, lookup: PowerLookup): number | undefined {
  const id = first(node.level);
  const v = id ? lookup(id) : null;
  return v ?? undefined;
}

/** Resolve the configured node list against live sensor readings. */
export function resolveFlow(
  nodes: readonly FlowNodeConfig[],
  lookup: PowerLookup,
  sunBelowHorizon: boolean,
): ResolvedFlow {
  const resolved: ResolvedNode[] = [];
  const counters = { input: 0, output: 0, storage: 0 };
  let inW = 0;
  let measuredOutW = 0;
  let anyInCapableConfigured = false;

  for (const [index, node] of nodes.entries()) {
    const base = {
      id: `node-${index}`,
      kind: node.kind,
      label: node.label || FALLBACK_LABELS[node.kind],
      icon: node.icon || FALLBACK_ICONS[node.kind],
      remainder: node.kind === "output" && node.remainder,
      priced: node.kind === "bidirectional" && node.priced,
      level: resolveLevel(node, lookup),
      resting: false,
    };
    if (node.kind === "input") {
      const r = resolveSum(node.entities, lookup);
      anyInCapableConfigured ||= r.configured;
      inW += r.watts;
      resolved.push({
        ...base,
        color: cycle(INPUT_COLORS, counters.input++),
        configured: r.configured,
        stale: r.stale,
        watts: r.watts,
        direction: r.watts > 0 ? "in" : "idle",
        resting: r.configured && sunBelowHorizon && r.watts <= SLEEP_THRESHOLD_W,
      });
    } else if (node.kind === "output") {
      const r = node.remainder
        ? { watts: 0, stale: false, configured: false }
        : resolveSum(node.entities, lookup);
      if (!node.remainder) measuredOutW += r.watts;
      resolved.push({
        ...base,
        color: cycle(OUTPUT_COLORS, counters.output++),
        configured: r.configured,
        stale: r.stale,
        watts: r.watts,
        direction: r.watts > 0 ? "out" : "idle",
      });
    } else {
      const r = resolveBidirectional(node, lookup);
      anyInCapableConfigured ||= r.configured;
      inW += r.inW;
      measuredOutW += r.outW;
      const direction: FlowDirection = r.inW > 0 ? "in" : r.outW > 0 ? "out" : "idle";
      resolved.push({
        ...base,
        color: node.priced ? energyColors.grid : cycle(STORAGE_COLORS, counters.storage++),
        configured: r.configured,
        stale: r.stale,
        watts: r.inW > 0 ? r.inW : r.outW,
        direction,
      });
    }
  }

  // Second pass: the remainder output soaks up whatever the measured outputs
  // don't account for, so the graph conserves.
  const remainderW = Math.max(0, inW - measuredOutW);
  for (const node of resolved) {
    if (!node.remainder) continue;
    node.watts = remainderW;
    node.direction = remainderW > 0 ? "out" : "idle";
    node.configured = anyInCapableConfigured;
  }

  const hubW = resolved.filter((n) => n.kind === "output").reduce((sum, n) => sum + n.watts, 0);

  return { nodes: resolved, hubW, flowState: toFlowState(resolved) };
}

/** Dominant supplying node's color tints the widget shell channel; falls back
 *  to the neutral home color when nothing meaningfully flows in. */
export function dominantColor(flow: ResolvedFlow): string {
  let top: ResolvedNode | undefined;
  for (const node of flow.nodes) {
    if (node.direction !== "in" || node.watts <= ACTIVE_THRESHOLD) continue;
    if (!top || node.watts > top.watts) top = node;
  }
  return top ? top.color : energyColors.home;
}

export interface NodeView {
  icon: string;
  label: string;
  value: string;
  color: string;
  idle: boolean;
  /** Running cost/earning/saving for the node (e.g. "€0.11/h"), when a tariff
   *  is configured and the node carries a priceable flow. */
  sub?: string;
  /** Hub renders the house glyph instead of an icon chip. */
  hub?: boolean;
}

export interface EnergyGraph {
  graph: FlowGraph;
  views: Map<string, NodeView>;
}

function levelSuffix(level: number | undefined): string {
  return level === undefined ? "" : ` · ${Math.round(level)}%`;
}

export function buildEnergyGraph(flow: ResolvedFlow, tariff?: Tariff): EnergyGraph {
  const graphNodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const views = new Map<string, NodeView>();

  const cost = tariff ? computeCost(flow.flowState, tariff) : null;
  const configuredInputs = flow.nodes.filter((n) => n.kind === "input" && n.configured);
  // Savings are an aggregate over all production, so the sub-line only reads
  // truthfully when a single input carries it.
  const soleInput = configuredInputs.length === 1 ? configuredInputs[0] : undefined;

  for (const node of flow.nodes) {
    if (!node.configured) continue;
    const active = node.watts > ACTIVE_THRESHOLD && node.direction !== "idle";
    const label = `${node.label}${levelSuffix(node.level)}`;

    if (node.kind === "output") {
      const idle = !active;
      views.set(node.id, {
        icon: node.icon,
        label,
        value: idle ? "idle" : formatPower(node.watts),
        color: node.color,
        idle,
      });
      graphNodes.push({ id: node.id, kind: "spend" });
      edges.push({
        id: node.id,
        from: { node: "hub" },
        to: { node: node.id },
        magnitude: idle ? 0 : node.watts,
        // Soft at the hub end, full node color at the node end.
        color: hubFade(node.color),
        colorTo: node.color,
        direction: "forward",
        idle,
      });
      continue;
    }

    // Inputs and two-way nodes feed the hub from the source column; a two-way
    // node flowing out reverses its ribbon (e.g. charging, exporting).
    const outbound = node.kind === "bidirectional" && node.direction === "out";
    // A priced node pushing outward reads visually distinct (export teal).
    const color = node.priced && outbound ? energyColors.export : node.color;
    const idle = !active;
    views.set(node.id, {
      icon: node.icon,
      label,
      value: node.resting ? "Back at sunrise" : idle ? "idle" : formatPower(node.watts),
      color,
      idle,
      sub:
        node.priced && active
          ? gridCostSub(cost)
          : node === soleInput
            ? solarSavingSub(cost)
            : undefined,
    });
    graphNodes.push({ id: node.id, kind: "source" });
    edges.push({
      id: node.id,
      from: { node: node.id },
      to: { node: "hub" },
      magnitude: idle ? 0 : node.watts,
      color,
      colorTo: hubFade(color),
      direction: outbound ? "reverse" : "forward",
      idle,
    });
  }

  // --- Hub: the house, carrying total consumption. ---
  graphNodes.push({ id: "hub", kind: "hub" });
  views.set("hub", {
    icon: energyIcons.home,
    label: "Home",
    value: formatPower(flow.hubW),
    color: energyColors.home,
    idle: false,
    hub: true,
  });

  return { graph: { nodes: graphNodes, edges }, views };
}
