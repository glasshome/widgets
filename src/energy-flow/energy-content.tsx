import { useDaylight, useWidgetDimensions, Widget } from "@glasshome/widget-sdk";
import { createMemo, Index, Show } from "solid-js";
import type { FlowDescription } from "../_energy-shared";
import { formatPower } from "../_energy-shared";
import { energyIcons } from "../_energy-shared/icons";
import houseDay from "./assets/house-clay.webp";
import houseNight from "./assets/house-clay-night.webp";
import type { Tariff } from "./cost";
import { ACTIVE_THRESHOLD, aggregate, isIdle, type ResolvedFlow } from "./flow";
import { selectTier } from "./layout";
import { Spine } from "./spine";
import "./house.css";

interface EnergyContentProps {
  flow: ResolvedFlow;
  description: FlowDescription;
  tariff: Tariff;
  title: string;
  onOpen: () => void;
}

function splitPower(watts: number): { value: string; unit: string } {
  const text = formatPower(watts);
  const i = text.lastIndexOf(" ");
  return i < 0 ? { value: text, unit: "" } : { value: text.slice(0, i), unit: text.slice(i + 1) };
}

export function EnergyContent(props: EnergyContentProps) {
  const dimensions = useWidgetDimensions();
  const daylight = useDaylight();

  const tier = createMemo(() => {
    const d = dimensions();
    return selectTier(d.width, d.height);
  });
  const idle = createMemo(() => isIdle(props.flow));
  const reading = createMemo(() => splitPower(props.flow.hubW));
  const glow = createMemo(() => Math.min(1, aggregate(props.flow.nodes).productionW / 4000));
  const activeNodes = createMemo(() =>
    props.flow.nodes.filter(
      (n) =>
        n.configured && n.kind !== "output" && n.watts > ACTIVE_THRESHOLD && n.direction !== "idle",
    ),
  );

  const house = () => (
    <div class="flow-house flow-house-art">
      <img src={houseDay} alt="" />
      <img
        src={houseNight}
        alt=""
        class="flow-house-night"
        data-visible={daylight().isNight || undefined}
      />
      <div class="flow-house-panels" style={{ opacity: glow() }} />
    </div>
  );

  return (
    <Widget.Content class={tier() === "full" ? "flow-tile-full" : undefined}>
      <Show when={tier() !== "full"}>
        <Widget.Glyph icon={energyIcons.home} />
      </Show>
      <Widget.Head
        icon={energyIcons.home}
        eyebrow={props.description.headline}
        name={props.title}
        active={!idle()}
      />
      <Show
        when={tier() === "full"}
        fallback={
          <>
            <Widget.Hero
              value={reading().value}
              unit={` ${reading().unit}`}
              sub="Home now"
              art={house()}
            />
            <Widget.Controls>
              <div class="flow-chips">
                <Index each={activeNodes()}>
                  {(n) => (
                    <Widget.Chip icon={n().icon} tone={n().color}>
                      {n().direction === "out" && n().kind === "bidirectional" ? "−" : ""}
                      {formatPower(n().watts)}
                    </Widget.Chip>
                  )}
                </Index>
              </div>
            </Widget.Controls>
          </>
        }
      >
        <div class="flow-scene">
          <Spine flow={props.flow} tariff={props.tariff} onTap={() => props.onOpen()} />
        </div>
      </Show>
    </Widget.Content>
  );
}
