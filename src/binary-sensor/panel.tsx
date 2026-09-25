import {
  type EntityView,
  isEntityActive,
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, type JSX, Show } from "solid-js";
import { getBinarySensorIcon } from "../common";
import { groupLine } from "../common/group";
import { getBinarySensorStateText } from "./utils";

const at = (date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

const battery = (e: EntityView) => {
  const level = e.attributes.battery_level ?? e.attributes.battery;
  return typeof level === "number" ? `${Math.round(level)}%` : undefined;
};

const word = (e: EntityView) => getBinarySensorStateText(e.deviceClass ?? null, isEntityActive(e));

/** The sensor, held: its door or window big, each member's state, and when it last changed. */
export function BinarySensorPanel(props: {
  entities: EntityView[];
  name: string;
  deviceClass: string | null;
  on: boolean;
  art?: JSX.Element;
}) {
  const active = () => props.entities.filter((e) => isEntityActive(e)).length;
  const group = () => props.entities.length > 1;
  const icon = () => getBinarySensorIcon(props.deviceClass, props.on);

  const facts = createMemo((): PanelFact[] =>
    props.entities.flatMap((e) => {
      const out: PanelFact[] = [];
      const when = at(e.lastChanged);
      if (when)
        out.push({
          icon: "mdi:history",
          label: group() ? e.friendlyName : "Last changed",
          value: group() ? `${word(e)} · ${when}` : when,
        });
      const charge = battery(e);
      if (charge)
        out.push({
          icon: "mdi:battery",
          label: group() ? `${e.friendlyName} battery` : "Battery",
          value: charge,
        });
      return out;
    }),
  );

  return (
    <WidgetPanel
      icon={icon()}
      tone={props.on ? "var(--tone-info)" : "var(--tone-neutral)"}
      name={props.name}
      art={
        props.art ?? (
          <Icon
            icon={icon()}
            width="100%"
            height="100%"
            style={{ color: "var(--widget-color)", opacity: 0.4 }}
          />
        )
      }
      value={getBinarySensorStateText(props.deviceClass, props.on)}
      caption={
        group()
          ? groupLine(active(), props.entities.length, {
              active: getBinarySensorStateText(props.deviceClass, true).toLowerCase(),
              rest: getBinarySensorStateText(props.deviceClass, false).toLowerCase(),
            })
          : undefined
      }
    >
      <Show when={group()}>
        <PanelSection label="Sensors">
          <PanelRows>
            <For each={props.entities}>
              {(e) => (
                <PanelRow
                  icon={getBinarySensorIcon(e.deviceClass ?? null, isEntityActive(e))}
                  name={e.friendlyName}
                  state={word(e)}
                  tone="var(--tone-info)"
                  on={isEntityActive(e)}
                />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={facts().length}>
        <PanelSection label={group() ? "Last changed" : "Readings"}>
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
