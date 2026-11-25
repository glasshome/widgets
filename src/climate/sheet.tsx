import {
  type EntityView,
  Icon,
  isDark,
  PanelSection,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
  useService,
  useTranslation,
} from "@glasshome/widget-sdk";
import { Index, Show } from "solid-js";
import type { Thermostat } from "../common";
import { spaced } from "../common/text";
import { getHvacModeIcon, getModeColors } from "./utils";
import { degrees, fanWord, hvacWord, presetWord } from "./words";

const list = (e: EntityView, key: string) => (e.attributes[key] as string[] | undefined) ?? [];
const isRange = (e: EntityView) =>
  e.attributes.target_temp_low != null && e.attributes.target_temp_high != null;

interface Choice {
  value: string;
  label: string;
  icon?: string;
}

/** One pick among a few; the row wraps onto more lines when it runs out of width. */
function Choices(props: {
  label: string;
  items: Choice[];
  value: string | undefined;
  tone: string;
  onPick: (value: string) => void;
}) {
  return (
    <ToggleGroup
      aria-label={props.label}
      class="w-full"
      tone={props.tone}
      value={props.value ?? null}
      onChange={(v: string | null) => v && props.onPick(v)}
    >
      <Index each={props.items}>
        {(c) => (
          <ToggleGroupItem value={c().value} aria-label={c().label}>
            <Show when={c().icon}>{(icon) => <Icon icon={icon()} width={18} />}</Show>
            {c().label}
          </ToggleGroupItem>
        )}
      </Index>
    </ToggleGroup>
  );
}

export const climateHasExtras = (e: EntityView) =>
  list(e, "hvac_modes").length > 1 ||
  list(e, "preset_modes").length > 0 ||
  list(e, "fan_modes").length > 0 ||
  isRange(e);

/**
 * What the climate tile cannot show: every mode, presets, fan speed, both ends of a range.
 * A sheet with no climate tile beside it passes `targetLabel` to get the single setpoint too.
 */
export function ClimateSheet(props: {
  entity: EntityView;
  thermostat: Thermostat;
  targetLabel?: string;
}) {
  const tools = useTranslation();
  const { t } = tools;
  const { callService } = useService();
  const call = (service: string, data: Record<string, unknown>) =>
    void callService("climate", service, data, { entity_id: props.entity.id });

  const hvacMode = () => props.entity.state;
  const tone = () => getModeColors(hvacMode(), isDark()).color;
  const hvacModes = () => list(props.entity, "hvac_modes");
  const presets = () => list(props.entity, "preset_modes");
  const fanModes = () => list(props.entity, "fan_modes");
  const setpoints = () => props.thermostat.setpoints;
  const band = () => {
    const v = setpoints().values();
    return v.length === 2 ? v : undefined;
  };
  const target = () => {
    const v = setpoints().values();
    return props.targetLabel !== undefined && v.length === 1 ? v[0] : undefined;
  };
  const reading = () => {
    const t = props.entity.attributes.current_temperature;
    return typeof t === "number" ? [t] : [];
  };
  const ends = (): [string, string] => [
    getModeColors("heat", isDark()).color,
    getModeColors("cool", isDark()).color,
  ];

  return (
    <>
      <Show when={target() !== undefined}>
        <PanelSection label={`${props.targetLabel} · ${degrees(tools, target() ?? 0)}°`}>
          <Slider
            value={[target() ?? 0]}
            min={props.thermostat.min()}
            max={props.thermostat.max()}
            step={props.thermostat.step()}
            fillTone={tone()}
            markers={reading()}
            onChange={(next) => setpoints().setPending(next)}
            onChangeEnd={(next) => setpoints().commitValues(next)}
            aria-label={t("climate.controls.target")}
          />
        </PanelSection>
      </Show>
      <Show when={hvacModes().length > 1}>
        <PanelSection label={t("climate.controls.mode")}>
          <Choices
            label={t("climate.controls.mode")}
            tone={tone()}
            value={hvacMode()}
            items={hvacModes().map((m) => ({
              value: m,
              label: hvacWord(tools, props.entity, m, spaced),
              icon: getHvacModeIcon(m),
            }))}
            onPick={(m) => call("set_hvac_mode", { hvac_mode: m })}
          />
        </PanelSection>
      </Show>
      <Show when={band()}>
        {(v) => (
          <PanelSection
            label={t("climate.sheet.band", {
              low: degrees(tools, v()[0]),
              high: degrees(tools, v()[1]),
            })}
          >
            <Slider
              value={v()}
              min={props.thermostat.min()}
              max={props.thermostat.max()}
              step={props.thermostat.step()}
              minStepsBetweenThumbs={1}
              thumbColors={ends()}
              fillTone={ends()}
              markers={reading()}
              onChange={(next) => setpoints().setPending(next)}
              onChangeEnd={(next) => setpoints().commitValues(next)}
              aria-label={t("climate.sheet.comfort-range")}
            />
          </PanelSection>
        )}
      </Show>
      <Show when={presets().length}>
        <PanelSection label={t("climate.sheet.preset")}>
          <Choices
            label={t("climate.sheet.preset")}
            tone={tone()}
            value={props.entity.attributes.preset_mode as string | undefined}
            items={presets().map((p) => ({ value: p, label: presetWord(tools, props.entity, p) }))}
            onPick={(p) => call("set_preset_mode", { preset_mode: p })}
          />
        </PanelSection>
      </Show>
      <Show when={fanModes().length}>
        <PanelSection label={t("climate.sheet.fan")}>
          <Choices
            label={t("climate.sheet.fan")}
            tone={tone()}
            value={props.entity.attributes.fan_mode as string | undefined}
            items={fanModes().map((f) => ({
              value: f,
              label: fanWord(tools, props.entity, f, spaced),
            }))}
            onPick={(f) => call("set_fan_mode", { fan_mode: f })}
          />
        </PanelSection>
      </Show>
    </>
  );
}
