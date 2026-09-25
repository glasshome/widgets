import {
  type EntityView,
  isEntityActive,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  useLocale,
  useStore,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For } from "solid-js";
import { groupLine } from "../common/group";

const DAY_MS = 86_400_000;

function when(date: Date, locale: string, now = new Date()): string {
  const time = date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (date.getTime() >= startOfToday) return `Today ${time}`;
  if (date.getTime() >= startOfToday - DAY_MS) return `Yesterday ${time}`;
  const day = date.toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
  return `${day} ${time}`;
}

/** The switch, held: its state big, since when, what it draws, and every member of a group. */
export function SwitchPanel(props: { entities: EntityView[]; name: string }) {
  const locale = useLocale();
  const primary = () => props.entities[0];
  const count = () => props.entities.length;
  const isOn = () => props.entities.some((e) => isEntityActive(e));
  const onCount = () => props.entities.filter((e) => isEntityActive(e)).length;
  const icon = () => (isOn() ? "mdi:power-plug" : "mdi:power-plug-off");

  const power = useStore((s) => {
    const e = primary();
    if (!e || count() !== 1) return undefined;
    const own = e.attributes.current_power_w;
    if (typeof own === "number") return `${Math.round(own)} W`;
    if (!e.deviceId) return undefined;
    for (const r of Object.values(s.entityRegistry)) {
      if (r.device_id !== e.deviceId || !r.entity_id.startsWith("sensor.")) continue;
      const sensor = s.entities[r.entity_id];
      if (sensor?.attributes.device_class !== "power") continue;
      const unit = sensor.attributes.unit_of_measurement ?? "W";
      return `${sensor.state} ${unit}`;
    }
    return undefined;
  });

  const facts = createMemo((): PanelFact[] => {
    const e = primary();
    if (!e || count() !== 1) return [];
    const out: PanelFact[] = [
      {
        icon: "mdi:clock-outline",
        label: isOn() ? "On since" : "Off since",
        value: when(e.lastChanged, locale()),
      },
    ];
    const watts = power();
    if (watts) out.push({ icon: "mdi:flash", label: "Drawing", value: watts });
    return out;
  });

  return (
    <WidgetPanel
      icon={icon()}
      tone={isOn() ? "var(--tone-success)" : "var(--tone-neutral)"}
      eyebrow={
        count() > 1 ? groupLine(onCount(), count(), { active: "on", rest: "off" }) : undefined
      }
      name={props.name}
      art={
        <Icon
          icon={icon()}
          width="100%"
          height="100%"
          style={{ height: "100%", color: "var(--widget-color)", opacity: 0.16 }}
        />
      }
      value={isOn() ? "On" : "Off"}
    >
      {count() > 1 ? (
        <PanelSection label="Switches">
          <PanelRows>
            <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
          </PanelRows>
        </PanelSection>
      ) : (
        <PanelSection label="Status">
          <PanelFacts items={facts()} />
        </PanelSection>
      )}
    </WidgetPanel>
  );
}
