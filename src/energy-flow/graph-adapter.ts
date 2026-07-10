/**
 * Maps an EnergyFlow onto the domain-agnostic flow-graph model: source/spend
 * nodes around a central hub, one ribbon per flow. The display text/icon/color
 * for each node lives in `views`, keyed by node id, so the renderer stays a
 * thin lookup. Pure — no SolidJS, no DOM.
 */

// Leaf imports (not the _energy-shared barrel): the barrel pulls JSX modules
// (icons/empty-state), which break bun's server-side test transpile. These three
// are pure data/functions, keeping this adapter unit-testable without DOM.
import { energyColors } from "../_energy-shared/colors";
import { formatPower } from "../_energy-shared/formatting";
import { energyIcons } from "../_energy-shared/icons";
import type { FlowEdge, FlowGraph, FlowNode } from "../_flow-graph/types";
import { computeCost, gridCostSub, solarSavingSub, type Tariff } from "./cost";
import { ACTIVE_THRESHOLD, type EnergyFlow } from "./flow";
import type { NodeDetailId } from "./node-detail";

/** Hub-end fade for a ribbon: its own color receding toward the theme
 *  background, so the flow quiets down as it reaches the house in either
 *  theme. Staying on one hue per ribbon matters: SVG gradients interpolate in
 *  sRGB, and blending two distant hues (e.g. solar amber into a shared blue)
 *  passes near gray and reads muddy. */
function hubFade(color: string): string {
  return `color-mix(in oklch, ${color} 55%, var(--background, transparent))`;
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

function socSuffix(soc: number | undefined): string {
  return soc === undefined ? "" : ` · ${Math.round(soc)}%`;
}

export function buildEnergyGraph(flow: EnergyFlow, tariff?: Tariff): EnergyGraph {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];
  const views = new Map<string, NodeView>();

  const cost = tariff ? computeCost(flow.flowState, tariff) : null;

  // --- Sources (solar, battery, grid) feed the hub on the left. ---
  if (flow.solar.configured) {
    const idle = flow.solar.watts <= ACTIVE_THRESHOLD;
    const watts = idle ? 0 : flow.solar.watts;
    views.set("solar", {
      icon: energyIcons.solar,
      label: "Solar",
      value: flow.solarSleeping ? "Back at sunrise" : idle ? "idle" : formatPower(flow.solar.watts),
      color: energyColors.solar,
      idle,
      sub: solarSavingSub(cost),
    });
    nodes.push({ id: "solar", kind: "source" });
    edges.push({
      id: "solar",
      from: { node: "solar" },
      to: { node: "hub" },
      magnitude: watts,
      color: energyColors.solar,
      colorTo: hubFade(energyColors.solar),
      direction: "forward",
      idle,
    });
  }

  if (flow.battery.configured) {
    const charging = flow.battery.direction === "charge";
    const active = flow.battery.watts > ACTIVE_THRESHOLD && flow.battery.direction !== "idle";
    const watts = active ? flow.battery.watts : 0;
    views.set("battery", {
      icon: energyIcons.battery,
      label: `Battery${socSuffix(flow.battery.soc)}`,
      value: active ? formatPower(flow.battery.watts) : "idle",
      color: energyColors.battery,
      idle: !active,
    });
    nodes.push({ id: "battery", kind: "source" });
    edges.push({
      id: "battery",
      from: { node: "battery" },
      to: { node: "hub" },
      magnitude: watts,
      // Charging flows hub -> battery (reverse); discharging powers the home.
      color: energyColors.battery,
      colorTo: hubFade(energyColors.battery),
      direction: charging ? "reverse" : "forward",
      idle: !active,
    });
  }

  if (flow.grid.configured) {
    const importing = flow.grid.direction === "import";
    const exporting = flow.grid.direction === "export";
    const active = flow.grid.watts > ACTIVE_THRESHOLD && flow.grid.direction !== "idle";
    const watts = active ? flow.grid.watts : 0;
    // Export reads visually distinct (teal) from import (grid blue).
    const color = exporting ? energyColors.export : energyColors.grid;
    views.set("grid", {
      icon: exporting ? energyIcons.export : energyIcons.grid,
      label: importing ? "From grid" : exporting ? "To grid" : "Grid",
      value: active ? formatPower(flow.grid.watts) : "idle",
      color,
      idle: !active,
      sub: active ? gridCostSub(cost) : undefined,
    });
    nodes.push({ id: "grid", kind: "source" });
    edges.push({
      id: "grid",
      from: { node: "grid" },
      to: { node: "hub" },
      magnitude: watts,
      color,
      colorTo: hubFade(color),
      // Export flows home -> grid (reverse).
      direction: exporting ? "reverse" : "forward",
      idle: !active,
    });
  }

  // --- Hub: the house, carrying total home consumption. ---
  nodes.push({ id: "hub", kind: "hub" });
  views.set("hub", {
    icon: energyIcons.home,
    label: "Home",
    value: formatPower(flow.home.watts),
    color: energyColors.home,
    idle: false,
    hub: true,
  });

  // --- Spend (EV, rest of home) draws from the hub on the right. ---
  const evConfigured = flow.ev.configured;
  if (evConfigured) {
    const idle = flow.ev.watts <= ACTIVE_THRESHOLD;
    const watts = idle ? 0 : flow.ev.watts;
    views.set("ev", {
      icon: energyIcons.ev,
      label: `EV charging${socSuffix(flow.ev.soc)}`,
      value: idle ? "idle" : formatPower(flow.ev.watts),
      color: energyColors.ev,
      idle,
    });
    nodes.push({ id: "ev", kind: "spend" });
    edges.push({
      id: "ev",
      from: { node: "hub" },
      to: { node: "ev" },
      magnitude: watts,
      // Soft at the hub end, full EV color at the node end.
      color: hubFade(energyColors.ev),
      colorTo: energyColors.ev,
      direction: "forward",
      idle,
    });
  }

  // "Rest of home" is a separate spend node only when an EV splits part of the
  // load off; without an EV it equals the whole home, which the hub already shows,
  // so we don't duplicate it (the hub IS the home).
  if (evConfigured && flow.home.configured) {
    const rest = Math.max(0, flow.home.watts - flow.ev.watts);
    const idle = rest <= ACTIVE_THRESHOLD;
    views.set("home", {
      icon: energyIcons.home,
      label: "Rest of home",
      value: formatPower(rest),
      color: energyColors.home,
      idle,
    });
    nodes.push({ id: "home", kind: "spend" });
    edges.push({
      id: "home",
      from: { node: "hub" },
      to: { node: "home" },
      magnitude: rest,
      color: hubFade(energyColors.home),
      colorTo: energyColors.home,
      direction: "forward",
      idle,
    });
  }

  return { graph: { nodes, edges }, views };
}

const DETAIL_IDS: Record<string, NodeDetailId> = {
  solar: "solar",
  grid: "grid",
  battery: "battery",
  ev: "ev",
  home: "home",
  hub: "home",
};

/** Map a graph node id to its detail panel (the hub opens the home detail). */
export function toDetailId(nodeId: string): NodeDetailId | null {
  return DETAIL_IDS[nodeId] ?? null;
}
