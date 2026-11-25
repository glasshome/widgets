import type { EntityView, TranslationTools } from "@glasshome/widget-sdk";
import { aggregateWord, stateWord } from "../common/state-word";
import { capitalised, spaced } from "../common/text";
import { type AreaMetrics, coverKind, doorKind, type EntityGroups } from "./utils";

export type AreaAction = "lights" | "covers" | "doors" | "climate" | "switches";

export interface Pill {
  action: AreaAction;
  icon: string;
  label: string;
  state: string;
  short: string;
  on: boolean;
  color: string;
}

export const WARM = "oklch(0.84 0.13 80)";

type Tools = Pick<TranslationTools, "t" | "translateState" | "formatNumber" | "formatTemperature">;

const STATE_WORDS: Record<string, string> = {
  on: "area.state.on",
  off: "area.state.off",
  open: "area.state.open",
  closed: "area.state.closed",
};

const MODE_WORDS: Record<string, string> = {
  off: "area.mode.off",
  heat: "area.mode.heat",
  cool: "area.mode.cool",
  auto: "area.mode.auto",
  dry: "area.mode.dry",
  fan_only: "area.mode.fan-only",
  heat_cool: "area.mode.heat-cool",
};

const stateOf = (tools: Tools, domain: string, sample: EntityView | undefined, state: string) =>
  aggregateWord(tools, domain, sample, state, STATE_WORDS);

export function occupancy(tools: Tools, m: AreaMetrics): string | undefined {
  if (m.hasMotion) return tools.t("area.occupancy.motion");
  if (m.hasPresence) return tools.t("area.occupancy.occupied");
  return undefined;
}

function climatePill(tools: Tools, entity: EntityView): Pill {
  const mode = entity.state;
  const target = entity.attributes?.temperature as number | undefined;
  const on = mode !== "off" && mode !== "unavailable";
  const degrees = (value: number) => `${tools.formatNumber(value, { maximumFractionDigits: 1 })}°`;
  const word = (state: string) => {
    const shown = stateWord(tools, { ...entity, state }, MODE_WORDS);
    return shown === state ? spaced(state) : capitalised(shown);
  };
  return {
    action: "climate",
    icon: mode === "cool" ? "mdi:snowflake" : "mdi:thermostat",
    label: tools.t("area.pill.climate"),
    state: on
      ? `${word(mode)}${target === undefined ? "" : ` · ${degrees(target)}`}`
      : stateOf(tools, "climate", entity, "off"),
    short: on && target !== undefined ? degrees(target) : stateOf(tools, "climate", entity, "off"),
    on,
    color: mode === "cool" ? "oklch(0.72 0.14 235)" : "oklch(0.7 0.19 35)",
  };
}

export function buildPills(tools: Tools, m: AreaMetrics, g: EntityGroups): Pill[] {
  const { t } = tools;
  const pills: Pill[] = [];
  if (m.lightsTotal > 0) {
    const sample = g.lights[0];
    pills.push({
      action: "lights",
      icon: m.lightsOn > 0 ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline",
      label: t("area.pill.lights"),
      state:
        m.lightsOn === 0
          ? stateOf(tools, "light", sample, "off")
          : m.lightsOn === m.lightsTotal
            ? stateOf(tools, "light", sample, "on")
            : t("area.pill.lights-some-on", { on: m.lightsOn, total: m.lightsTotal }),
      short:
        m.lightsOn === 0
          ? stateOf(tools, "light", sample, "off")
          : t("area.pill.lights-on", { count: m.lightsOn }),
      on: m.lightsOn > 0,
      color: WARM,
    });
  }
  if (m.coversTotal > 0) {
    const kind = coverKind(g.covers);
    const sample = g.covers[0];
    const state =
      m.coversOpen === 0
        ? stateOf(tools, "cover", sample, "closed")
        : m.coversOpen === m.coversTotal
          ? stateOf(tools, "cover", sample, "open")
          : t("area.pill.covers-open", { count: m.coversOpen });
    pills.push({
      action: "covers",
      icon: m.coversOpen > 0 ? kind.open : kind.closed,
      label: t(kind.key, { count: m.coversTotal }),
      state,
      short: state,
      on: m.coversOpen > 0,
      color: "oklch(0.74 0.12 230)",
    });
  }
  if (g.doors.length > 0) {
    const kind = doorKind(g.doors);
    const open = m.doorsOpen;
    const sample = g.doors[0];
    const state =
      open === 0
        ? stateOf(tools, "cover", sample, "closed")
        : open === g.doors.length
          ? stateOf(tools, "cover", sample, "open")
          : t("area.pill.doors-open", { count: open });
    pills.push({
      action: "doors",
      icon: open > 0 ? kind.open : kind.closed,
      label: t(kind.key, { count: g.doors.length }),
      state,
      short: state,
      on: open > 0,
      color: "oklch(0.78 0.14 75)",
    });
  }
  const climate = g.climate[0];
  if (climate) pills.push(climatePill(tools, climate));
  if (g.switches.length > 0) {
    const on = g.switches.filter((s) => s.state === "on").length;
    const sample = g.switches[0];
    const state =
      on === 0
        ? stateOf(tools, "switch", sample, "off")
        : g.switches.length === 1
          ? stateOf(tools, "switch", sample, "on")
          : t("area.pill.switches-on", { count: on });
    pills.push({
      action: "switches",
      icon: "mdi:power-plug",
      label:
        g.switches.length === 1
          ? (sample?.friendlyName ?? t("area.pill.switches", { count: 1 }))
          : t("area.pill.switches", { count: g.switches.length }),
      state,
      short: state,
      on: on > 0,
      color: "oklch(0.74 0.16 150)",
    });
  }
  return pills;
}

export function temperatureText(tools: Tools, m: AreaMetrics): string | undefined {
  if (m.temperature === null) return undefined;
  const unit = m.temperatureUnit ?? "°C";
  if (unit === "°C" || unit === "°F") {
    return tools.formatTemperature(m.temperature, { unit, digits: 1 });
  }
  const shown = tools.formatNumber(m.temperature, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${shown} ${unit}`;
}

export function humidityText(tools: Tools, humidity: number): string {
  return tools.formatNumber(humidity / 100, { style: "percent" });
}
