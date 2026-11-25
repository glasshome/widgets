import {
  Button,
  hassMediaUrl,
  Icon,
  imagePreset,
  imageUrl,
  Toggle,
  useDaylight,
  useTranslation,
  useWidgetDimensions,
  Widget,
} from "@glasshome/widget-sdk";
import { createMemo, Index, type JSX, Show } from "solid-js";
import { isRoomKind, type RoomPhotos, roomIcon, roomPhotos } from "../common/art/room";
import "./area-content.css";
import type { AreaMetrics, EntityGroups } from "./utils";
import {
  type AreaAction,
  buildPills,
  humidityText,
  occupancy,
  type Pill,
  temperatureText,
  WARM,
} from "./words";

interface AreaContentProps {
  metrics: AreaMetrics;
  groups: EntityGroups;
  areaName: string;
  areaIcon: string | null | undefined;
  picture: string | null | undefined;
  image?: string;
  onAction: (action: AreaAction) => void;
  onMore: () => void;
}

export function builtInRoom(image: string | undefined) {
  const room = imagePreset(image);
  return isRoomKind(room) ? room : undefined;
}

export function useRoomScene(
  source: () => { image?: string; picture: string | null | undefined; lightsOn: number },
) {
  const daylight = useDaylight();
  const photos = (): RoomPhotos | undefined => {
    const { image, picture } = source();
    const room = builtInRoom(image);
    if (room) return roomPhotos(room);
    const own = imageUrl(image) ?? hassMediaUrl(picture);
    return own ? { day: own } : undefined;
  };
  const scene = () => {
    const p = photos();
    if (!daylight().isNight || !p?.nightOff || !p.nightOn) return "day";
    return source().lightsOn > 0 ? "night-on" : "night-off";
  };
  const shown = () => {
    const p = photos();
    if (!p) return undefined;
    const s = scene();
    if (s === "night-on") return p.nightOn;
    if (s === "night-off") return p.nightOff;
    return p.day;
  };
  return { photos, scene, shown };
}

export function AreaContent(props: AreaContentProps) {
  const tools = useTranslation();
  const dims = useWidgetDimensions();
  const m = () => props.metrics;
  const { photos, scene } = useRoomScene(() => ({
    image: props.image,
    picture: props.picture,
    lightsOn: m().lightsOn,
  }));
  const pills = createMemo(() => buildPills(tools, m(), props.groups));

  const chipWidth = (p: Pill) => 46 + p.short.length * 7.6 + 6;
  const visiblePills = () => {
    let room = dims().width - 2 * 16 - 50;
    const out: Pill[] = [];
    for (const p of pills()) {
      room -= chipWidth(p);
      if (room < 0) break;
      out.push(p);
    }
    return out;
  };
  const presence = createMemo(() => occupancy(tools, m()));
  const temperature = createMemo(() => temperatureText(tools, m()));
  const humidity = createMemo(() => {
    const h = m().humidity;
    return h === null ? undefined : Math.round(h);
  });
  // Built once: a sensor tick updates its text, never swaps its nodes.
  const summary: JSX.Element = (
    <>
      {presence()}
      <Show when={temperature()}>
        {presence() ? " · " : ""}
        {temperature()}
      </Show>
      <Show when={humidity() !== undefined}>
        {presence() || temperature() ? " · " : ""}
        <span class="area-humidity">
          <Icon icon="mdi:water-percent" width={14} />
          {humidityText(tools, humidity() ?? 0)}
          <span class="sr-only"> {tools.t("area.humidity")}</span>
        </span>
      </Show>
    </>
  );
  const hasSummary = () =>
    presence() !== undefined || temperature() !== undefined || humidity() !== undefined;
  const warmth = () => (m().lightsTotal === 0 ? 0 : 12 + (m().lightsOn / m().lightsTotal) * 30);

  return (
    <Widget.Content accent={WARM}>
      <Widget.Backdrop>
        <Show
          when={photos()}
          fallback={<div class="area-ambient" style={{ "--area-warmth": `${warmth()}%` }} />}
        >
          {(p) => (
            <>
              <img src={p().day} alt="" />
              <Show when={p().nightOff}>
                {(src) => (
                  <img
                    src={src()}
                    alt=""
                    class="area-night"
                    data-visible={scene() === "night-off" || undefined}
                  />
                )}
              </Show>
              <Show when={p().nightOn}>
                {(src) => (
                  <img
                    src={src()}
                    alt=""
                    class="area-night"
                    data-visible={scene() === "night-on" || undefined}
                  />
                )}
              </Show>
              <div
                class="glasshome-widget-backdrop-light"
                style={{ "--backdrop-light": scene() === "day" ? warmth() / 42 : 0 }}
              />
            </>
          )}
        </Show>
      </Widget.Backdrop>
      <Widget.Head
        icon={props.areaIcon ?? roomIcon(builtInRoom(props.image))}
        active={m().lightsOn > 0}
        eyebrow={hasSummary() ? summary : undefined}
        name={props.areaName}
        aside={
          <Show when={m().alertCount > 0}>
            <Widget.Chip icon="mdi:alert-circle" tone="var(--destructive)">
              {tools.t("area.alert")}
            </Widget.Chip>
          </Show>
        }
      />
      <Widget.Controls>
        {/* By position: a tick rebuilds every pill object, and For would remount them all. */}
        <Index each={visiblePills()}>
          {(pill) => (
            <Toggle
              variant="outline"
              pressed={pill().on}
              onChange={() => props.onAction(pill().action)}
              aria-label={tools.t("area.pill.aria", { label: pill().label, state: pill().state })}
              class="glasshome-widget-control-wide"
            >
              <Icon
                icon={pill().icon}
                width={18}
                style={pill().on ? { color: pill().color } : undefined}
              />
              <span>{pill().short}</span>
            </Toggle>
          )}
        </Index>
        <Button
          variant="outline"
          size="icon"
          aria-label={tools.t("area.more")}
          class="glasshome-widget-control"
          onClick={() => props.onMore()}
        >
          <Icon icon="mdi:chevron-right" width={20} />
        </Button>
      </Widget.Controls>
    </Widget.Content>
  );
}
