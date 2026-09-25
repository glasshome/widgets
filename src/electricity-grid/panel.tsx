import { type PanelFact, PanelFacts, PanelSection, WidgetPanel } from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";
import pylonArt from "./assets/pylon.webp";
import type { OutlookHour } from "./outlook";
import { liveWires, PYLON_ASPECT, TIPS, wirePath } from "./pylon-art";
import type { Verdict } from "./verdict";

/** The pylon as one SVG, so the panel needs no stylesheet: wires lit by the low-carbon share. */
function PanelPylon(props: { lowCarbonPct: number; tint: string }) {
  const green = () => liveWires(props.lowCarbonPct);
  return (
    <svg
      viewBox={`0 0 ${PYLON_ASPECT} 1`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMaxYMax meet"
      overflow="visible"
      aria-hidden="true"
    >
      <For each={TIPS}>
        {(t, i) => (
          <path
            d={wirePath(t, PYLON_ASPECT)}
            fill="none"
            stroke-width={i() < green() ? 2.5 : 1.5}
            vector-effect="non-scaling-stroke"
            opacity={i() < green() ? 0.9 : 0.45}
            style={{ stroke: i() < green() ? props.tint : "var(--muted-foreground)" }}
          />
        )}
      </For>
      <image href={pylonArt} width={PYLON_ASPECT} height="1" />
    </svg>
  );
}

const hourLabel = (d: Date) => d.toLocaleTimeString(undefined, { hour: "numeric" });

/** The grid, held: the pylon big, the verdict, the readings behind it and the hours ahead. */
export function ElectricityGridPanel(props: {
  name: string;
  verdict: Verdict;
  tint: string;
  co2: number | null;
  price: number | null;
  priceUnit: string;
  showPrice: boolean;
  outlook: OutlookHour[];
  format: (value: number) => string;
}) {
  const withUnit = (v: number) =>
    `${props.format(v)}${props.priceUnit ? ` ${props.priceUnit}` : ""}`;
  const note = () => props.verdict.priceNote;

  const facts = createMemo((): PanelFact[] => {
    const out: PanelFact[] = [
      {
        icon: "mdi:leaf",
        label: "Low-carbon",
        value: `${Math.round(props.verdict.lowCarbonPct)}%`,
      },
    ];
    if (props.co2 !== null)
      out.push({
        icon: "mdi:molecule-co2",
        label: "Carbon",
        value: `${props.format(props.co2)} g/kWh`,
      });
    if (props.showPrice && props.price !== null)
      out.push({ icon: "mdi:cash", label: "Price", value: withUnit(props.price) });
    return out;
  });

  const ahead = createMemo((): PanelFact[] =>
    props.outlook.map((h) => {
      const now = props.price;
      const icon =
        now === null || Math.abs(h.price - now) < 0.005
          ? "mdi:minus"
          : h.price < now
            ? "mdi:arrow-bottom-right"
            : "mdi:arrow-top-right";
      return { icon, label: hourLabel(h.start), value: props.format(h.price) };
    }),
  );

  return (
    <WidgetPanel
      icon="mdi:transmission-tower"
      tone={props.tint}
      eyebrow={note() ? `${note().charAt(0).toUpperCase()}${note().slice(1)}` : "Electricity grid"}
      name={props.name}
      art={<PanelPylon lowCarbonPct={props.verdict.lowCarbonPct} tint={props.tint} />}
      value={props.verdict.phrase}
      caption={`${Math.round(props.verdict.lowCarbonPct)}% low-carbon`}
    >
      <PanelSection label="Right now">
        <PanelFacts items={facts()} />
      </PanelSection>
      <Show when={ahead().length}>
        <PanelSection label={props.priceUnit ? `Next hours · ${props.priceUnit}` : "Next hours"}>
          <PanelFacts items={ahead()} />
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
