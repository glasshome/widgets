import {
  type EntityView,
  isDark,
  PanelSection,
  Slider,
  ToggleGroup,
  ToggleGroupItem,
  useService,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import type { useSetpoints } from "../common";
import { FAN_MODES, getHvacModeIcon, getModeColors, HVAC_MODES } from "./utils";

const words = (raw: string) => {
  const s = raw.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const degrees = (t: number) => (Number.isInteger(t) ? `${t}` : t.toFixed(1));

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
      <For each={props.items}>
        {(c) => (
          <ToggleGroupItem value={c.value} aria-label={c.label}>
            <Show when={c.icon}>{(icon) => <Icon icon={icon()} width={18} />}</Show>
            {c.label}
          </ToggleGroupItem>
        )}
      </For>
    </ToggleGroup>
  );
}

export const climateHasExtras = (e: EntityView) =>
  list(e, "hvac_modes").length > 1 ||
  list(e, "preset_modes").length > 0 ||
  list(e, "fan_modes").length > 0 ||
  isRange(e);

/** What the climate tile cannot show: every mode, presets, fan speed, both ends of a range. */
export function ClimateSheet(props: {
  entity: EntityView;
  setpoints: ReturnType<typeof useSetpoints>;
  min: number;
  max: number;
  step: number;
}) {
  const { callService } = useService();
  const call = (service: string, data: Record<string, unknown>) =>
    void callService("climate", service, data, { entity_id: props.entity.id });

  const hvacMode = () => props.entity.state;
  const tone = () => getModeColors(hvacMode(), isDark()).color;
  const hvacModes = () => list(props.entity, "hvac_modes");
  const presets = () => list(props.entity, "preset_modes");
  const fanModes = () => list(props.entity, "fan_modes");
  const band = () => {
    const v = props.setpoints.values();
    return v.length === 2 ? v : undefined;
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
      <Show when={hvacModes().length > 1}>
        <PanelSection label="Mode">
          <Choices
            label="Mode"
            tone={tone()}
            value={hvacMode()}
            items={hvacModes().map((m) => ({
              value: m,
              label: HVAC_MODES[m]?.label ?? words(m),
              icon: getHvacModeIcon(m),
            }))}
            onPick={(m) => call("set_hvac_mode", { hvac_mode: m })}
          />
        </PanelSection>
      </Show>
      <Show when={band()}>
        {(v) => (
          <PanelSection label={`Heats below ${degrees(v()[0])}°, cools above ${degrees(v()[1])}°`}>
            <Slider
              value={v()}
              min={props.min}
              max={props.max}
              step={props.step}
              minStepsBetweenThumbs={1}
              thumbColors={ends()}
              fillTone={ends()}
              markers={reading()}
              onChange={(next) => props.setpoints.setPending(next)}
              onChangeEnd={(next) => props.setpoints.commitValues(next)}
              aria-label="Comfort range"
            />
          </PanelSection>
        )}
      </Show>
      <Show when={presets().length}>
        <PanelSection label="Preset">
          <Choices
            label="Preset"
            tone={tone()}
            value={props.entity.attributes.preset_mode as string | undefined}
            items={presets().map((p) => ({ value: p, label: words(p) }))}
            onPick={(p) => call("set_preset_mode", { preset_mode: p })}
          />
        </PanelSection>
      </Show>
      <Show when={fanModes().length}>
        <PanelSection label="Fan">
          <Choices
            label="Fan"
            tone={tone()}
            value={props.entity.attributes.fan_mode as string | undefined}
            items={fanModes().map((f) => ({ value: f, label: FAN_MODES[f]?.label ?? words(f) }))}
            onPick={(f) => call("set_fan_mode", { fan_mode: f })}
          />
        </PanelSection>
      </Show>
    </>
  );
}
