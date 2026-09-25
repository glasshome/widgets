import {
  Button,
  type EntityView,
  PanelRow,
  PanelRows,
  PanelSection,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For } from "solid-js";

const pressedAt = (stamp: string | undefined) => {
  const date = stamp ? new Date(stamp) : undefined;
  if (!date || Number.isNaN(date.getTime())) return undefined;
  const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  return `${date.toLocaleDateString([], { month: "short", day: "numeric" })} · ${time}`;
};

/** The button, held: its icon big, when it was last pressed, a Press, and each button on its own row. */
export function ButtonPanel(props: {
  entities: EntityView[];
  name: string;
  busy: boolean;
  onPress: () => void;
}) {
  const { callService } = useService();
  const group = () => props.entities.length > 1;
  const latest = createMemo(() => {
    const stamps = props.entities
      .map((e) => new Date(e.state).getTime())
      .filter((t) => !Number.isNaN(t));
    return stamps.length ? pressedAt(new Date(Math.max(...stamps)).toISOString()) : undefined;
  });

  return (
    <WidgetPanel
      icon="mdi:gesture-tap-button"
      tone="var(--tone-accent)"
      eyebrow={group() ? `${props.entities.length} buttons` : "Button"}
      name={props.name}
      art={
        <Icon
          icon="mdi:gesture-tap-button"
          width="100%"
          height="100%"
          style={{ color: "var(--widget-color)", opacity: 0.4 }}
        />
      }
      hint="Last pressed"
      value={latest() ?? "Never"}
      actions={
        <Button variant="outline" disabled={props.busy} onClick={props.onPress}>
          <Icon icon="mdi:gesture-tap" width={18} />
          {group() ? "Press all" : "Press"}
        </Button>
      }
    >
      <PanelSection label={group() ? "Buttons" : "Button"}>
        <PanelRows>
          <For each={props.entities}>
            {(e) => (
              <PanelRow
                icon={e.icon ?? "mdi:gesture-tap-button"}
                name={e.friendlyName}
                state={pressedAt(e.state) ? `Pressed ${pressedAt(e.state)}` : "Never pressed"}
                tone="var(--tone-accent)"
                on={false}
                onTap={() => void callService(e.domain, "press", {}, { entity_id: e.id })}
              />
            )}
          </For>
        </PanelRows>
      </PanelSection>
    </WidgetPanel>
  );
}
