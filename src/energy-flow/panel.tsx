import {
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  useDaylight,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createMemo, createUniqueId, For, Index, Show } from "solid-js";
import { type FlowDescription, formatMoney, formatPower } from "../_energy-shared";
import { energyIcons } from "../_energy-shared/icons";
import houseDay from "./assets/house-clay.webp";
import houseNight from "./assets/house-clay-night.webp";
import { computeCost, type Tariff } from "./cost";
import { ACTIVE_THRESHOLD, aggregate, type ResolvedFlow, type ResolvedNode } from "./flow";
import { buildEnergyGraph } from "./graph-adapter";
import { flowWidth, layoutHouseScene, ribbonShape, type SceneRole } from "./house-scene";

const BOX = { width: 800, height: 560 };
const ROLE: Record<ResolvedNode["kind"], SceneRole> = {
  input: "roof",
  output: "wall-right",
  bidirectional: "base",
};
const COST_THRESHOLD = 0.005;

function splitPower(watts: number): { value: string; unit: string } {
  const text = formatPower(watts);
  const i = text.lastIndexOf(" ");
  return i < 0 ? { value: text, unit: "" } : { value: text.slice(0, i), unit: text.slice(i + 1) };
}

function directionWord(node: ResolvedNode): string | undefined {
  if (node.kind !== "bidirectional" || node.direction === "idle") return undefined;
  if (node.priced) return node.direction === "in" ? "Importing" : "Exporting";
  return node.direction === "in" ? "Discharging" : "Charging";
}

/** The house with every flow reaching it, drawn as one SVG so it needs no stylesheet. */
function FlowHouseArt(props: { flow: ResolvedFlow }) {
  const daylight = useDaylight();
  const glowId = createUniqueId();
  const placed = createMemo(() => props.flow.nodes.filter((n) => n.configured));
  const sceneNodes = createMemo(
    () => placed().map((n) => ({ id: n.id, role: ROLE[n.kind] })),
    undefined,
    {
      equals: (a, b) =>
        a.length === b.length && a.every((x, i) => x.id === b[i]?.id && x.role === b[i]?.role),
    },
  );
  const scene = createMemo(() => layoutHouseScene(sceneNodes(), BOX));
  const maxWatts = createMemo(() => Math.max(1, ...placed().map((n) => n.watts)));
  const glow = createMemo(() => Math.min(1, aggregate(props.flow.nodes).productionW / 4000));
  const house = () => scene().house;

  return (
    <svg
      viewBox={`0 0 ${BOX.width} ${BOX.height}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={glowId}>
          <stop offset="0%" stop-color="oklch(0.9 0.14 85)" stop-opacity="0.6" />
          <stop offset="70%" stop-color="oklch(0.9 0.14 85)" stop-opacity="0" />
        </radialGradient>
      </defs>
      <For each={scene().links}>
        {(link) => {
          const node = () => placed().find((n) => n.id === link.id);
          const active = () => {
            const n = node();
            return !!n && n.watts > ACTIVE_THRESHOLD && n.direction !== "idle";
          };
          const from = () =>
            link.side === "bottom"
              ? { x: link.from.x, y: BOX.height }
              : { x: link.side === "left" ? 0 : BOX.width, y: link.from.y };
          const ribbon = () => {
            const wide = flowWidth(node()?.watts ?? 0, maxWatts()) * 2.4;
            const thin = Math.max(2, wide * 0.3);
            const toHouse = node()?.kind !== "output" && node()?.direction !== "out";
            const shape = { side: link.side, from: from(), anchor: link.anchor };
            return toHouse ? ribbonShape(shape, thin, wide) : ribbonShape(shape, wide, thin);
          };
          return (
            <Show when={active()}>
              <path d={ribbon()} opacity="0.75" style={{ fill: node()?.color }} />
            </Show>
          );
        }}
      </For>
      <image
        href={houseDay}
        x={house().x}
        y={house().y}
        width={house().w}
        height={house().h}
        preserveAspectRatio="xMidYMid meet"
      />
      <image
        href={houseNight}
        x={house().x}
        y={house().y}
        width={house().w}
        height={house().h}
        preserveAspectRatio="xMidYMid meet"
        opacity={daylight().isNight ? 1 : 0}
      />
      <ellipse
        cx={house().x + house().w * 0.43}
        cy={house().y + house().h * 0.22}
        rx={house().w * 0.35}
        ry={house().h * 0.2}
        fill={`url(#${glowId})`}
        opacity={glow()}
      />
    </svg>
  );
}

/** Energy flow, held: the house big with every flow reaching it, and each source and use as a row. */
export function EnergyFlowPanel(props: {
  flow: ResolvedFlow;
  description: FlowDescription;
  tariff: Tariff;
  name: string;
  tone: string;
}) {
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

  const state = (n: ResolvedNode) => {
    if (n.stale) return "Unavailable";
    if (n.resting) return "Back at sunrise";
    const active = n.watts > ACTIVE_THRESHOLD && n.direction !== "idle";
    const parts = [active ? formatPower(n.watts) : "Idle"];
    const word = active ? directionWord(n) : undefined;
    if (word) parts.unshift(word);
    if (n.level !== undefined) parts.push(`${Math.round(n.level)}%`);
    return parts.join(" · ");
  };

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

  const reading = () => splitPower(props.flow.hubW);

  const row = (n: () => ResolvedNode) => (
    <PanelRow
      icon={n().icon}
      name={n().label}
      state={state(n())}
      tone={views().get(n().id)?.color ?? n().color}
      on={share(n()) > 0}
      fill={share(n())}
      aria-label={`${n().label}, ${state(n())}`}
    />
  );

  return (
    <WidgetPanel
      icon={energyIcons.home}
      tone={props.tone}
      eyebrow={props.description.headline}
      name={props.name}
      art={<FlowHouseArt flow={props.flow} />}
      value={
        <>
          {reading().value}
          <small>{reading().unit}</small>
        </>
      }
      caption="Home now"
    >
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
    </WidgetPanel>
  );
}
