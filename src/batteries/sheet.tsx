import {
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
} from "@glasshome/widget-sdk";
import { For } from "solid-js";
import { type BatteryDevice, batteryName, getBatteryColor, getBatteryIcon } from "./utils";

/** Every battery in the home, lowest first, each row filled to its charge. */
export function BatteriesSheet(props: { batteries: BatteryDevice[]; threshold: number }) {
  const facts = (): PanelFact[] => {
    const low = props.batteries.filter((b) => b.isLow).length;
    const silent = props.batteries.filter((b) => !b.isAvailable).length;
    const out: PanelFact[] = [
      { icon: "mdi:battery", label: "Batteries", value: String(props.batteries.length) },
      {
        icon: "mdi:battery-alert",
        label: `Below ${props.threshold}%`,
        value: low === 0 ? "None" : String(low),
      },
    ];
    if (silent > 0)
      out.push({ icon: "mdi:battery-unknown", label: "Not reporting", value: String(silent) });
    return out;
  };

  return (
    <>
      <PanelSection label="Overview">
        <PanelFacts items={facts()} />
      </PanelSection>
      <PanelSection label="Lowest first">
        <PanelRows>
          <For each={props.batteries}>
            {(b) => (
              <PanelRow
                icon={getBatteryIcon(b.level)}
                name={batteryName(b.entity)}
                state={b.isAvailable ? `${b.level}%` : "Not reporting"}
                tone={getBatteryColor(b.level)}
                on={b.isAvailable}
                fill={b.level}
              />
            )}
          </For>
        </PanelRows>
      </PanelSection>
    </>
  );
}
