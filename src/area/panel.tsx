import {
  type AreaView,
  Button,
  hassMediaUrl,
  imagePreset,
  imageUrl,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  SwatchPicker,
  useDaylight,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show } from "solid-js";
import { LIGHT_SWATCHES, swatchService } from "../common/light-swatches";
import { isRoomKind, roomIcon, roomPhotos } from "../common/art/room";
import type { AreaMetrics } from "./utils";

const SECTIONS: { label: string; domains: string[] }[] = [
  { label: "Lights", domains: ["light"] },
  { label: "Climate and air", domains: ["climate", "fan", "humidifier"] },
  { label: "Blinds and doors", domains: ["cover", "lock"] },
  { label: "Media", domains: ["media_player"] },
  { label: "Switches", domains: ["switch", "input_boolean"] },
];

const FACT_WORD: Record<string, [string, string]> = {
  window: ["Open", "Closed"],
  door: ["Open", "Closed"],
  garage_door: ["Open", "Closed"],
  opening: ["Open", "Closed"],
  motion: ["Detected", "Clear"],
  occupancy: ["Detected", "Clear"],
  presence: ["Home", "Away"],
  moisture: ["Wet", "Dry"],
  smoke: ["Smoke", "Clear"],
};
const FACT_ICON: Record<string, string> = {
  window: "mdi:window-closed-variant",
  door: "mdi:door",
  garage_door: "mdi:garage",
  opening: "mdi:door",
  motion: "mdi:motion-sensor",
  occupancy: "mdi:account",
  presence: "mdi:account",
  moisture: "mdi:water",
  smoke: "mdi:smoke-detector",
};

const live = (s: string) => s !== "unavailable" && s !== "unknown";

/** The room, held: its photo lit by how bright the room is, its scenes, and every device in it. */
export function AreaPanel(props: {
  area: AreaView;
  name: string;
  image?: string;
  metrics: AreaMetrics;
}) {
  const { callService } = useService();
  const daylight = useDaylight();

  const byDomain = (domains: string[]) =>
    props.area.entities.filter((e) => domains.includes(e.domain) && live(e.state));
  const lights = () => byDomain(["light"]);
  const scenes = () => byDomain(["scene"]);

  const roomLevel = createMemo(() => {
    const on = lights().filter((l) => l.state === "on");
    if (on.length === 0) return 0;
    const sum = on.reduce((acc, l) => {
      const b = l.attributes.brightness;
      return acc + (typeof b === "number" ? (b / 255) * 100 : 100);
    }, 0);
    return Math.round(sum / on.length);
  });
  const [dragged, setDragged] = createSignal<number>();
  const level = () => dragged() ?? roomLevel();

  const setRoom = (value: number) => {
    setDragged(undefined);
    const ids = lights().map((l) => l.id);
    if (ids.length === 0) return;
    void callService(
      "light",
      value > 0 ? "turn_on" : "turn_off",
      value > 0 ? { brightness_pct: value } : {},
      { entity_id: ids },
    );
  };

  const [swatch, setSwatch] = createSignal<string | null>(null);
  const colourRoom = (color: string) => {
    setSwatch(color);
    const ids = lights().filter((l) => l.state === "on").map((l) => l.id);
    if (ids.length === 0) return;
    void callService("light", "turn_on", swatchService(color), { entity_id: ids });
  };

  const builtInRoom = () => {
    const room = imagePreset(props.image);
    return isRoomKind(room) ? room : undefined;
  };
  const photos = () => {
    const room = builtInRoom();
    if (room) return roomPhotos(room);
    const own = imageUrl(props.image) ?? hassMediaUrl(props.area.picture);
    return own ? { day: own } : undefined;
  };

  const eyebrow = () => {
    const parts: string[] = [];
    if (props.metrics.temperature !== null) parts.push(`${props.metrics.temperature.toFixed(1)}°`);
    if (props.metrics.humidity !== null) parts.push(`${Math.round(props.metrics.humidity)}%`);
    return parts.length ? parts.join(" · ") : undefined;
  };

  const facts = createMemo((): PanelFact[] => {
    const out: PanelFact[] = [];
    if (props.metrics.co2 !== null)
      out.push({ icon: "mdi:molecule-co2", label: "CO₂", value: `${Math.round(props.metrics.co2)} ppm` });
    for (const e of byDomain(["binary_sensor"])) {
      const cls = e.deviceClass ?? "";
      const words = FACT_WORD[cls];
      if (!words) continue;
      out.push({
        icon: FACT_ICON[cls] ?? "mdi:eye",
        label: e.friendlyName,
        value: e.state === "on" ? words[0] : words[1],
      });
    }
    return out.slice(0, 4);
  });

  return (
    <WidgetPanel
      icon={props.area.icon ?? roomIcon(builtInRoom())}
      tone="var(--tone-warning)"
      eyebrow={eyebrow()}
      name={props.name}
      backdrop={
        <Show when={photos()}>
          {(p) => (
            <>
              <img src={daylight().isNight && p().nightOff ? p().nightOff : p().day} alt="" />
              <Show when={daylight().isNight && p().nightOn}>
                {(src) => <img src={src()} alt="" style={{ opacity: level() / 100 }} />}
              </Show>
            </>
          )}
        </Show>
      }
      hint={lights().length ? "Drag anywhere to dim the room" : undefined}
      value={
        lights().length ? (
          <>
            {level()}
            <small>%</small>
          </>
        ) : undefined
      }
      caption={
        lights().length
          ? `${props.metrics.lightsOn} of ${props.metrics.lightsTotal} lights on`
          : undefined
      }
      slide={
        lights().length ? { value: level(), onChange: setDragged, onCommit: setRoom } : undefined
      }
      actions={
        <Show when={scenes().length || lights().length}>
          <For each={scenes()}>
            {(s) => (
              <Button
                variant="outline"
                onClick={() => void callService("scene", "turn_on", {}, { entity_id: s.id })}
              >
                {s.friendlyName}
              </Button>
            )}
          </For>
          <Show when={props.metrics.lightsOn > 0}>
            <Button variant="outline" onClick={() => setRoom(0)}>
              All off
            </Button>
          </Show>
        </Show>
      }
    >
      <For each={SECTIONS}>
        {(section) => (
          <Show when={byDomain(section.domains).length}>
            <PanelSection label={section.label}>
              <PanelRows>
                <For each={byDomain(section.domains)}>
                  {(e) => <PanelEntityRow entityId={e.id} within={props.area.name} />}
                </For>
              </PanelRows>
              <Show when={section.domains.includes("light")}>
                <SwatchPicker
                  value={swatch()}
                  colors={LIGHT_SWATCHES}
                  onChange={colourRoom}
                  aria-label="Colour of the lights that are on"
                />
              </Show>
            </PanelSection>
          </Show>
        )}
      </For>
      <Show when={facts().length}>
        <PanelSection label="Sensors">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
