import {
  Button,
  type EntityView,
  hassMediaUrl,
  Icon,
  Toggle,
  useDaylight,
  useWidgetDimensions,
} from "@glasshome/widget-sdk";
import { createMemo, For, type JSX, Show } from "solid-js";
import { type RoomPhotos, roomIcon, roomPhotos } from "../common/art/room";
import { TILE_INNER_RADIUS, Tile, TileBackdrop, TileChip, TileHead } from "../common/tile/tile";
import "./area-content.css";
import { type AreaMetrics, coverKind, doorKind, type EntityGroups } from "./utils";

export type AreaAction = "lights" | "covers" | "doors" | "climate" | "switches";

interface AreaContentProps {
  metrics: AreaMetrics;
  groups: EntityGroups;
  areaName: string;
  areaIcon: string | null | undefined;
  picture: string | null | undefined;
  onAction: (action: AreaAction) => void;
  onMore: () => void;
}

interface Pill {
  action: AreaAction;
  icon: string;
  label: string;
  state: string;
  short: string;
  on: boolean;
  color: string;
}

const WARM = "oklch(0.84 0.13 80)";

function occupancy(m: AreaMetrics): string | undefined {
  if (m.hasMotion) return "Motion";
  if (m.hasPresence) return "Occupied";
  return undefined;
}

function climatePill(entity: EntityView): Pill {
  const mode = entity.state;
  const target = entity.attributes?.temperature as number | undefined;
  const on = mode !== "off" && mode !== "unavailable";
  return {
    action: "climate",
    icon: mode === "cool" ? "mdi:snowflake" : "mdi:thermostat",
    label: "Climate",
    state: on
      ? `${mode.charAt(0).toUpperCase()}${mode.slice(1)}${target === undefined ? "" : ` · ${target}°`}`
      : "Off",
    short: on && target !== undefined ? `${target}°` : "Off",
    on,
    color: mode === "cool" ? "oklch(0.72 0.14 235)" : "oklch(0.7 0.19 35)",
  };
}

function buildPills(m: AreaMetrics, g: EntityGroups): Pill[] {
  const pills: Pill[] = [];
  if (m.lightsTotal > 0) {
    pills.push({
      action: "lights",
      icon: m.lightsOn > 0 ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline",
      label: "Lights",
      state:
        m.lightsOn === 0
          ? "Off"
          : m.lightsOn === m.lightsTotal
            ? "On"
            : `${m.lightsOn} of ${m.lightsTotal} on`,
      short: m.lightsOn === 0 ? "Off" : `${m.lightsOn} on`,
      on: m.lightsOn > 0,
      color: WARM,
    });
  }
  if (m.coversTotal > 0) {
    const kind = coverKind(g.covers);
    pills.push({
      action: "covers",
      icon: m.coversOpen > 0 ? kind.open : kind.closed,
      label: m.coversTotal === 1 ? kind.one : kind.many,
      state:
        m.coversOpen === 0
          ? "Closed"
          : m.coversOpen === m.coversTotal
            ? "Open"
            : `${m.coversOpen} open`,
      short:
        m.coversOpen === 0
          ? "Closed"
          : m.coversOpen === m.coversTotal
            ? "Open"
            : `${m.coversOpen} open`,
      on: m.coversOpen > 0,
      color: "oklch(0.74 0.12 230)",
    });
  }
  if (g.doors.length > 0) {
    const kind = doorKind(g.doors);
    const open = m.doorsOpen;
    const state = open === 0 ? "Closed" : open === g.doors.length ? "Open" : `${open} open`;
    pills.push({
      action: "doors",
      icon: open > 0 ? kind.open : kind.closed,
      label: g.doors.length === 1 ? kind.one : kind.many,
      state,
      short: state,
      on: open > 0,
      color: "oklch(0.78 0.14 75)",
    });
  }
  const climate = g.climate[0];
  if (climate) pills.push(climatePill(climate));
  if (g.switches.length > 0) {
    const on = g.switches.filter((s) => s.state === "on").length;
    pills.push({
      action: "switches",
      icon: "mdi:power-plug",
      label: g.switches.length === 1 ? (g.switches[0]?.friendlyName ?? "Switch") : "Switches",
      state: on === 0 ? "Off" : g.switches.length === 1 ? "On" : `${on} on`,
      short: on === 0 ? "Off" : g.switches.length === 1 ? "On" : `${on} on`,
      on: on > 0,
      color: "oklch(0.74 0.16 150)",
    });
  }
  return pills;
}

export function AreaContent(props: AreaContentProps) {
  const dims = useWidgetDimensions();
  const m = () => props.metrics;
  const photos = (): RoomPhotos | undefined => {
    const own = hassMediaUrl(props.picture);
    return own ? { day: own } : roomPhotos(props.areaName);
  };
  const daylight = useDaylight();
  const scene = () => {
    const p = photos();
    if (!daylight().isNight || !p?.nightOff || !p.nightOn) return "day";
    return m().lightsOn > 0 ? "night-on" : "night-off";
  };
  const pills = createMemo(() => buildPills(m(), props.groups));

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
  const summary = () => {
    const temperature = m().temperature;
    const humidity = m().humidity;
    const parts: JSX.Element[] = [];
    const presence = occupancy(m());
    if (presence) parts.push(presence);
    if (temperature !== null) parts.push(`${temperature.toFixed(1)}°`);
    if (humidity !== null)
      parts.push(
        <span class="area-humidity" aria-label={`${Math.round(humidity)}% humidity`}>
          <Icon icon="mdi:water-percent" width={14} />
          {Math.round(humidity)}%
        </span>,
      );
    return parts.length === 0 ? undefined : parts.flatMap((p, i) => (i === 0 ? [p] : [" · ", p]));
  };
  const warmth = () => (m().lightsTotal === 0 ? 0 : 12 + (m().lightsOn / m().lightsTotal) * 30);

  return (
    <Tile backdrop active={m().lightsOn > 0} accent={WARM}>
      <TileBackdrop>
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
                class="tile-backdrop-light"
                style={{ "--backdrop-light": scene() === "day" ? warmth() / 42 : 0 }}
              />
            </>
          )}
        </Show>
      </TileBackdrop>
      <TileHead
        icon={props.areaIcon ?? roomIcon(props.areaName)}
        active={m().lightsOn > 0}
        eyebrow={summary()}
        name={props.areaName}
        aside={
          <>
            <Show when={m().alertCount > 0}>
              <TileChip icon="mdi:alert-circle" tone="var(--destructive)">
                Alert
              </TileChip>
            </Show>
          </>
        }
      />
      <div class="area-spacer" />
      <div class="area-chips" on:pointerdown={(e) => e.stopPropagation()}>
        <For each={visiblePills()}>
          {(pill) => (
            <Toggle
              variant="outline"
              pressed={pill.on}
              onChange={() => props.onAction(pill.action)}
              aria-label={`${pill.label}: ${pill.state}`}
              class={`area-chip ${TILE_INNER_RADIUS}`}
            >
              <Icon
                icon={pill.icon}
                width={18}
                style={pill.on ? { color: pill.color } : undefined}
              />
              <span>{pill.short}</span>
            </Toggle>
          )}
        </For>
        <Button
          variant="outline"
          size="icon"
          aria-label="More"
          class={`area-chip area-more ${TILE_INNER_RADIUS}`}
          onClick={props.onMore}
        >
          <Icon icon="mdi:chevron-right" width={20} />
        </Button>
      </div>
    </Tile>
  );
}
