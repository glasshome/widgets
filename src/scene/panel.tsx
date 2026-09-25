import {
  type EntityView,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For } from "solid-js";

const ranAt = (stamp: string) => {
  const date = new Date(stamp);
  if (Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

/** The scenes, held: the last one run and every scene on its own row, a tap runs it. */
export function ScenePanel(props: { entities: EntityView[]; name: string }) {
  const group = () => props.entities.length > 1;
  const lastRun = createMemo(() => {
    let latest: EntityView | undefined;
    for (const e of props.entities) {
      const t = new Date(e.state).getTime();
      if (Number.isNaN(t)) continue;
      if (!latest || t > new Date(latest.state).getTime()) latest = e;
    }
    return latest;
  });
  const value = () => {
    const last = lastRun();
    if (last) return ranAt(last.state);
    return group() ? `${props.entities.length} scenes` : "Ready";
  };
  const caption = () => {
    const last = lastRun();
    if (!last) return group() ? "Tap one to run it" : "Tap to run";
    return group() ? `Last run · ${last.friendlyName}` : "Last run";
  };

  return (
    <WidgetPanel
      icon="mdi:palette"
      tone="var(--tone-accent)"
      eyebrow={group() && lastRun() ? `${props.entities.length} scenes` : undefined}
      name={props.name}
      art={
        <Icon
          icon="mdi:palette"
          width="100%"
          height="100%"
          style={{ color: "var(--widget-color)", opacity: 0.4 }}
        />
      }
      value={value()}
      caption={caption()}
    >
      <PanelSection label={group() ? "Scenes" : "Scene"}>
        <PanelRows>
          <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
        </PanelRows>
      </PanelSection>
    </WidgetPanel>
  );
}
