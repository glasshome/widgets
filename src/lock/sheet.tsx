import {
  type EntityView,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
} from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";

const at = (date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

/** What a group of locks cannot show on its tile: each door on its own row, and when each changed. */
export function LockSheet(props: { entities: EntityView[] }) {
  const facts = createMemo((): PanelFact[] =>
    props.entities.flatMap((e) => {
      const when = at(e.lastChanged);
      if (!when) return [];
      return [
        {
          icon: e.state === "locked" ? "mdi:lock" : "mdi:lock-open-variant",
          label: e.friendlyName,
          value: when,
        },
      ];
    }),
  );

  return (
    <>
      <PanelSection label="Doors">
        <PanelRows>
          <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
        </PanelRows>
      </PanelSection>
      <Show when={facts().length}>
        <PanelSection label="Last changed">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </>
  );
}
