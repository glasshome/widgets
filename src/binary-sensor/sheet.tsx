import {
  type EntityView,
  isEntityActive,
  PanelRow,
  PanelRows,
  PanelSection,
} from "@glasshome/widget-sdk";
import { For } from "solid-js";
import { getBinarySensorIcon } from "../common";
import { getBinarySensorStateText } from "./utils";

const at = (date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

const line = (e: EntityView) => {
  const word = getBinarySensorStateText(e.deviceClass ?? null, isEntityActive(e));
  const when = at(e.lastChanged);
  return when ? `${word} · ${when}` : word;
};

/** What a group of sensors cannot show on its tile: each sensor's own word, and since when. */
export function BinarySensorSheet(props: { entities: EntityView[] }) {
  return (
    <PanelSection label="Sensors">
      <PanelRows>
        <For each={props.entities}>
          {(e) => (
            <PanelRow
              icon={getBinarySensorIcon(e.deviceClass ?? null, isEntityActive(e))}
              name={e.friendlyName}
              state={line(e)}
              tone="var(--tone-info)"
              on={isEntityActive(e)}
            />
          )}
        </For>
      </PanelRows>
    </PanelSection>
  );
}
