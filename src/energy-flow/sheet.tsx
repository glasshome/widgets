import {
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  useTranslation,
} from "@glasshome/widget-sdk";
import { createMemo, Index, Show } from "solid-js";
import { type EnergyTools, formatMoney, formatPower } from "../_energy-shared/formatting";
import { energyIcons } from "../_energy-shared/icons";
import { computeCost, type Tariff } from "./cost";
import { ACTIVE_THRESHOLD, aggregate, type ResolvedFlow, type ResolvedNode } from "./flow";
import { buildEnergyGraph, levelPercent } from "./graph-adapter";

const COST_THRESHOLD = 0.005;

function directionWord(node: ResolvedNode, tools: EnergyTools): string | undefined {
  if (node.kind !== "bidirectional" || node.direction === "idle") return undefined;
  if (node.priced) {
    return tools.t(
      node.direction === "in" ? "energy-flow.node.importing" : "energy-flow.node.exporting",
    );
  }
  return tools.t(
    node.direction === "in" ? "energy-flow.node.discharging" : "energy-flow.node.charging",
  );
}

function nodeState(n: ResolvedNode, tools: EnergyTools): string {
  if (n.stale) return tools.t("energy-flow.sheet.unavailable");
  if (n.resting) return tools.t("energy-flow.node.resting");
  const active = n.watts > ACTIVE_THRESHOLD && n.direction !== "idle";
  const parts = [active ? formatPower(n.watts, tools) : tools.t("energy-flow.sheet.idle")];
  const word = active ? directionWord(n, tools) : undefined;
  if (word) parts.unshift(word);
  if (n.level !== undefined) parts.push(levelPercent(n.level, tools));
  return parts.join(" · ");
}

/** Each source and use with its share of the flow, and what the flow earns or costs. */
export function EnergyFlowSheet(props: { flow: ResolvedFlow; tariff: Tariff }) {
  const tools = useTranslation();
  const views = createMemo(() => buildEnergyGraph(props.flow, tools, props.tariff).views);
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
        label: tools.t("energy-flow.sheet.producing"),
        value: formatPower(agg.productionW, tools),
      });
    }
    if (props.flow.hubW > ACTIVE_THRESHOLD && configured().some((n) => n.priced)) {
      const own = Math.max(0, Math.min(1, 1 - agg.pricedInW / props.flow.hubW));
      out.push({
        icon: energyIcons.home,
        label: tools.t("energy-flow.sheet.self-powered"),
        value: tools.formatNumber(Math.round(own * 100) / 100, { style: "percent" }),
      });
    }
    const cost = computeCost(props.flow.flowState, props.tariff);
    if (cost && Math.abs(cost.gridPerHour) > COST_THRESHOLD) {
      out.push({
        icon: "mdi:cash",
        label: tools.t(
          cost.gridPerHour > 0 ? "energy-flow.sheet.grid-cost" : "energy-flow.sheet.earning",
        ),
        value: tools.t("energy-flow.cost.per-hour", {
          amount: formatMoney(cost.gridPerHour, cost.currency, tools),
        }),
      });
    }
    if (cost && cost.solarSavingPerHour > COST_THRESHOLD) {
      out.push({
        icon: "mdi:piggy-bank-outline",
        label: tools.t("energy-flow.sheet.saving"),
        value: tools.t("energy-flow.cost.per-hour", {
          amount: formatMoney(cost.solarSavingPerHour, cost.currency, tools),
        }),
      });
    }
    return out;
  });

  const row = (n: () => ResolvedNode) => (
    <PanelRow
      icon={n().icon}
      name={n().label}
      state={nodeState(n(), tools)}
      tone={views().get(n().id)?.color ?? n().color}
      on={share(n()) > 0}
      fill={share(n())}
    />
  );

  return (
    <>
      <Show when={facts().length}>
        <PanelSection label={tools.t("energy-flow.sheet.right-now")}>
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
      <Show when={sources().length}>
        <PanelSection label={tools.t("energy-flow.sheet.sources")}>
          <PanelRows>
            <Index each={sources()}>{row}</Index>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={uses().length}>
        <PanelSection label={tools.t("energy-flow.sheet.using-power")}>
          <PanelRows>
            <Index each={uses()}>{row}</Index>
          </PanelRows>
        </PanelSection>
      </Show>
    </>
  );
}
