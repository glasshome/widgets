import { PanelFacts, PanelRow, PanelRows, PanelSection, WidgetPanel } from "@glasshome/widget-sdk";
import { For, Show } from "solid-js";
import { type BatteryDevice, getBatteryColor, getBatteryIcon } from "./utils";


/** Every battery in the home, lowest first, each row filled to its charge. */
export function BatteriesPanel(props: {
  batteries: BatteryDevice[];
  name: string;
  threshold: number;
}) {
  const lowest = () => props.batteries[0];
  const low = () => props.batteries.filter((b) => b.isLow);
  const unavailable = () => props.batteries.filter((b) => !b.isAvailable).length;

  const facts = () => {
    const out = [
      {
        icon: "mdi:battery-alert",
        label: `Below ${props.threshold}%`,
        value: low().length === 0 ? "None" : String(low().length),
      },
      { icon: "mdi:battery", label: "Batteries", value: String(props.batteries.length) },
    ];
    if (unavailable() > 0)
      out.push({ icon: "mdi:battery-unknown", label: "Not reporting", value: String(unavailable()) });
    return out;
  };

  return (
    <WidgetPanel
      icon={low().length ? "mdi:battery-alert" : "mdi:battery"}
      tone={low().length ? "var(--tone-warning)" : "var(--tone-success)"}
      eyebrow={lowest()?.entity.friendlyName}
      name={props.name}
      value={
        <Show when={lowest()} fallback="--">
          {(b) => (
            <>
              {b().level}
              <small>%</small>
            </>
          )}
        </Show>
      }
      caption={
        props.batteries.length === 0
          ? "No batteries found"
          : low().length === 0
          ? "All batteries are fine"
          : low().length === 1
            ? "1 battery to replace soon"
            : `${low().length} batteries to replace soon`
      }
    >
      <PanelSection label="Overview">
        <PanelFacts items={facts()} />
      </PanelSection>
      <Show when={props.batteries.length}>
        <PanelSection label="Lowest first">
          <PanelRows>
            <For each={props.batteries}>
              {(b) => (
                <PanelRow
                  icon={getBatteryIcon(b.level)}
                  name={b.entity.friendlyName || b.entity.id}
                  state={b.isAvailable ? `${b.level}%` : "Not reporting"}
                  tone={getBatteryColor(b.level)}
                  on={b.isAvailable}
                  fill={b.level}
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
