import {
  Button,
  type EntityView,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createMemo, For, type JSX, Show } from "solid-js";

const at = (date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

/** The locks, held: the door big, a lock-all for what is open, and every door on its own row. */
export function LockPanel(props: {
  entities: EntityView[];
  name: string;
  eyebrow: string;
  locked: boolean;
  art: JSX.Element;
}) {
  const { callService } = useService();
  const unlocked = () => props.entities.filter((e) => e.state !== "locked");

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
    <WidgetPanel
      icon={props.locked ? "mdi:lock" : "mdi:lock-open-variant"}
      tone={props.locked ? "var(--tone-success)" : "var(--tone-warning)"}
      eyebrow={props.eyebrow}
      name={props.name}
      art={props.art}
      value={props.locked ? "Locked" : "Unlocked"}
      actions={
        <Show when={unlocked().length}>
          <Button
            variant="outline"
            onClick={() =>
              void callService("lock", "lock", {}, { entity_id: unlocked().map((e) => e.id) })
            }
          >
            {props.entities.length > 1 ? "Lock all" : "Lock"}
          </Button>
        </Show>
      }
    >
      <PanelSection label={props.entities.length > 1 ? "Doors" : "Door"}>
        <PanelRows>
          <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
        </PanelRows>
      </PanelSection>
      <Show when={facts().length}>
        <PanelSection label="Last changed">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
