import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { FAN_MODES, HVAC_MODES } from "./utils";

type Tools = Pick<TranslationTools, "t" | "translateState">;

const CATALOG_ONLY = new Set(["heat_cool", "fan_only"]);

const ACTION_WORDS: Record<string, string> = {
  heating: "climate.action.heating",
  cooling: "climate.action.cooling",
  drying: "climate.action.drying",
  fan: "climate.action.fan",
  preheating: "climate.action.preheating",
  defrosting: "climate.action.defrosting",
};

const capitalised = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;
export const spaced = (raw: string) => capitalised(raw.replaceAll("_", " "));

const climateEntity = (sample: StateEntity | undefined, state: string): StateEntity => ({
  domain: "climate",
  state,
  platform: sample?.platform ?? "",
  attributes: {},
  deviceClass: null,
});

export function hvacWord(
  tools: Tools,
  sample: StateEntity | undefined,
  mode: string,
  rawWord: (mode: string) => string,
): string {
  const entry = Object.hasOwn(HVAC_MODES, mode) ? HVAC_MODES[mode] : undefined;
  if (entry && CATALOG_ONLY.has(mode)) return tools.t(entry.key);
  const word = tools.translateState(climateEntity(sample, mode));
  if (word !== mode) return word;
  return entry ? tools.t(entry.key) : rawWord(mode);
}

export function fanWord(
  tools: Tools,
  sample: StateEntity,
  mode: string,
  rawWord: (mode: string) => string,
): string {
  const word = tools.translateState(sample, { attribute: "fan_mode", value: mode });
  if (word !== mode) return word;
  return Object.hasOwn(FAN_MODES, mode) ? tools.t(FAN_MODES[mode]?.key ?? "") : rawWord(mode);
}

export function presetWord(tools: Tools, sample: StateEntity, preset: string): string {
  const word = tools.translateState(sample, { attribute: "preset_mode", value: preset });
  return word === preset ? spaced(preset) : word;
}

export function actionWord(tools: Tools, sample: StateEntity, action: string): string {
  const word = tools.translateState(sample, { attribute: "hvac_action", value: action });
  if (word !== action) return word;
  return Object.hasOwn(ACTION_WORDS, action)
    ? tools.t(ACTION_WORDS[action] ?? "")
    : capitalised(action);
}

export const degrees = (tools: Pick<TranslationTools, "formatNumber">, value: number) =>
  tools.formatNumber(value, { maximumFractionDigits: 1 });

export function targetText(
  tools: Pick<TranslationTools, "t" | "formatTemperature">,
  values: number[],
  unit: string,
): string | undefined {
  const [low, high] = values;
  if (low === undefined) return undefined;
  const deg = unit === "F" ? "°F" : "°C";
  const shown = (v: number) => tools.formatTemperature(v, { unit: deg });
  if (high === undefined) return shown(low);
  return tools.t("climate.target.range", { low: shown(low), high: shown(high) });
}

export function climateSub(
  tools: Pick<TranslationTools, "t" | "formatTemperature" | "formatNumber">,
  input: { current: number | undefined; humidity: number | undefined; unit: string },
): string {
  const { current, humidity, unit } = input;
  return [
    current === undefined
      ? undefined
      : tools.t("climate.sub.now", {
          temperature: tools.formatTemperature(current, { unit: unit === "F" ? "°F" : "°C" }),
        }),
    humidity === undefined
      ? undefined
      : tools.formatNumber(humidity / 100, { style: "percent", maximumFractionDigits: 1 }),
  ]
    .filter(Boolean)
    .join(" · ");
}
