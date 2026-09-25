import {
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
} from "@glasshome/widget-sdk";
import { createMemo, Index, Show } from "solid-js";
import { formatMoney, formatPower } from "../_energy-shared";
import { energyIcons } from "../_energy-shared/icons";
import { computeCost, type Tariff } from "./cost";
import { ACTIVE_THRESHOLD, aggregate, type ResolvedFlow, type ResolvedNode } from "./flow";
import { buildEnergyGraph } from "./graph-adapter";

const COST_THRESHOLD = 0.005;

function directionWord(node: ResolvedNode): string | undefined {
  if (node.kind !== "bidirectional" || node.direction === "idle") return undefined;
  if (node.priced) return node.direction === "in" ? "Importing" : "Exporting";
  return node.direction === "in" ? "Discharging" : "Charging";
}

function nodeState(n: ResolvedNode): string {
  if (n.stale) return "Unavailable";
  if (n.resting) return "Back at sunrise";
  const active = n.watts > ACTIVE_THRESHOLD && n.direction !== "idle";
  const parts = [active ? formatPower(n.watts) : "Idle"];
  const word = active ? directionWord(n) : undefined;
  if (word) parts.unshift(word);
  if (n.level !== undefined) parts.push(`${Math.round(n.level)}%`);
  return parts.join(" · ");
}

/** What the energy tile cannot show: each source and use with its share of the flow, and what the flow earns or costs. */
export function EnergyFlowSheet(props: { flow: ResolvedFlow; tariff: Tariff }) {
  const views = createMemo(() => buildEnergyGraph(props.flow, props.tariff).views);
  const configured = createMemo(() => props.flow.nodes.filter((n) => n.configured));
  const sources = () => configured().filter((n) => n.kind !== "output");
  const uses = () => configured().filter((n) => n.kind === "output");

  const total = createMemo(() => {
    const agg = aggregate(props.flow.nodes);
    const inW = agg.productionW + agg.pricedInW + agg.storageInW;
    return Math.max(1, inW, props.flow.hubW + agg.pricedOutW + agg.storageOutW);
  });
  const share = (n: ResolvedNode) =>
    n.direction === "idle" ? 0 : Math.round(Math.min(100, (n.watts / total()) * 100));

  const facts = createMemo((): PanelFact[] => {
    const agg = aggregate(props.flow.nodes);
    const out: PanelFact[] = [];
    if (configured().some((n) => n.kind === "input")) {
      out.push({
        icon: energyIcons.solar,
        label: "Producing",
        value: formatPower(agg.productionW),
      });
    }
    if (props.flow.hubW > ACTIVE_THRESHOLD && configured().some((n) => n.priced)) {
      const own = Math.max(0, Math.min(1, 1 - agg.pricedInW / props.flow.hubW));
      out.push({
        icon: energyIcons.home,
        label: "Self-powered",
        value: `${Math.round(own * 100)}%`,
      });
    }
    const cost = computeCost(props.flow.flowState, props.tariff);
    if (cost && Math.abs(cost.gridPerHour) > COST_THRESHOLD) {
      out.push({
        icon: "mdi:cash",
        label: cost.gridPerHour > 0 ? "Grid cost" : "Earning",
        value: `${formatMoney(Math.abs(cost.gridPerHour), cost.currency)}/h`,
      });
    }
    if (cost && cost.solarSavingPerHour > COST_THRESHOLD) {
      out.push({
        icon: "mdi:piggy-bank-outline",
        label: "Saving",
        value: `${formatMoney(cost.solarSavingPerHour, cost.currency)}/h`,
      });
    }
    return out;
  });

  const row = (n: () => ResolvedNode) => (
    <PanelRow
      icon={n().icon}
      name={n().label}
      state={nodeState(n())}
      tone={views().get(n().id)?.color ?? n().color}
      on={share(n()) > 0}
      fill={share(n())}
    />
  );

  return (
    <>
      <Show when={facts().length}>
        <PanelSection label="Right now">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
      <Show when={sources().length}>
        <PanelSection label="Sources">
          <PanelRows>
            <Index each={sources()}>{row}</Index>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={uses().length}>
        <PanelSection label="Using power">
          <PanelRows>
            <Index each={uses()}>{row}</Index>
          </PanelRows>
        </PanelSection>
      </Show>
    </>
  );
}
