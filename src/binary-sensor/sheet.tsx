import {
  type EntityView,
  isEntityActive,
  PanelRow,
  PanelRows,
  PanelSection,
  type TranslationTools,
  useTranslation,
} from "@glasshome/widget-sdk";
import { For } from "solid-js";
import { getBinarySensorIcon } from "../common";
import { getBinarySensorStateText } from "./utils";

export function sensorLine(tools: TranslationTools, e: EntityView, now: Date = new Date()): string {
  const word = getBinarySensorStateText(tools, e, e.deviceClass ?? null, isEntityActive(e));
  const date = e.lastChanged;
  if (Number.isNaN(date.getTime())) return word;
  const time = tools.formatDate(date, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return `${word} · ${time}`;
  const day = tools.formatDate(date, { month: "short", day: "numeric" });
  return `${word} · ${day} · ${time}`;
}

/** What a group of sensors cannot show on its tile: each sensor's own word, and since when. */
export function BinarySensorSheet(props: { entities: EntityView[] }) {
  const tools = useTranslation();
  return (
    <PanelSection label={tools.t("binary-sensor.sheet.sensors")}>
      <PanelRows>
        <For each={props.entities}>
          {(e) => (
            <PanelRow
              icon={getBinarySensorIcon(e.deviceClass ?? null, isEntityActive(e))}
              name={e.friendlyName}
              state={sensorLine(tools, e)}
              tone="var(--tone-info)"
              on={isEntityActive(e)}
            />
          )}
        </For>
      </PanelRows>
    </PanelSection>
  );
}
