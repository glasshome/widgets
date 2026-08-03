import { type EntityView, Slider, useService, useTemperatureUnit } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import { formatTemperature, ModeChips, useSetpoints } from "../common";
import { FAN_MODES, HVAC_MODES } from "./utils";

interface ClimateControlsProps {
  entities: () => EntityView[];
}

// Cool / heat setpoint accents for the range slider (blue = cool-to, amber = heat-to).
const COOL = "oklch(0.68 0.15 235)";
const HEAT = "oklch(0.66 0.19 40)";

export function ClimateControls(props: ClimateControlsProps) {
  const { callService } = useService();

  const entity = () => props.entities()[0];
  const entityId = () => entity()?.id;

  const currentTemp = () => entity()?.attributes?.current_temperature as number | undefined;
  const temperatureUnit = useTemperatureUnit();
  const tempUnit = () => {
    const unit = entity()?.attributes?.temperature_unit as string | undefined;
    return (unit ?? temperatureUnit()).replace("°", "");
  };
  // HA reports no target_temp_step for many devices; its own frontend defaults
  // to 1°F / 0.5°C. Sending half-degrees to a whole-number (°F) device gets
  // rounded away, so the step never sticks.
  const tempStep = () => {
    const step = entity()?.attributes?.target_temp_step as number | undefined;
    if (step) return step;
    return tempUnit() === "F" ? 1 : 0.5;
  };
  const minTemp = () =>
    (entity()?.attributes?.min_temp as number | undefined) ?? (tempUnit() === "F" ? 45 : 7);
  const maxTemp = () =>
    (entity()?.attributes?.max_temp as number | undefined) ?? (tempUnit() === "F" ? 95 : 35);

  // heat_cool devices (e.g. Honeywell T6 Pro in Auto) drive target_temp_low/high
  // instead of a single temperature. Detect by the attributes actually present.
  const isRange = () => {
    const a = entity()?.attributes;
    return a?.target_temp_low != null && a?.target_temp_high != null;
  };

  const stateTemps = () => {
    const a = entity()?.attributes;
    if (isRange()) return [a?.target_temp_low as number, a?.target_temp_high as number];
    const t = a?.temperature as number | undefined;
    return t == null ? [] : [t];
  };

  const setpointState = useSetpoints({
    stateValues: stateTemps,
    min: minTemp,
    max: maxTemp,
    step: tempStep,
    commit: (values) => {
      const id = entityId();
      if (!id || values.length === 0) return;
      const data = isRange()
        ? { target_temp_low: values[0], target_temp_high: values[1] }
        : { temperature: values[0] };
      callService("climate", "set_temperature", data, { entity_id: id });
    },
  });
  const temps = setpointState.values;

  const setpoints = () => {
    const t = temps();
    if (isRange()) {
      return [
        { index: 0, label: "Cool to", color: COOL, value: t[0] },
        { index: 1, label: "Heat to", color: HEAT, value: t[1] },
      ];
    }
    return [{ index: 0, label: "Target", color: "var(--primary)", value: t[0] }];
  };

  const hvacMode = () => (entity()?.state ?? "off") as string;
  const hvacModes = () => (entity()?.attributes?.hvac_modes as string[] | undefined) ?? [];
  const fanModes = () => (entity()?.attributes?.fan_modes as string[] | undefined) ?? null;
  const fanMode = () => entity()?.attributes?.fan_mode as string | undefined;
  const presetModes = () => (entity()?.attributes?.preset_modes as string[] | undefined) ?? null;
  const presetMode = () => entity()?.attributes?.preset_mode as string | undefined;

  const callModeService = (service: string, field: string) => (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService("climate", service, { [field]: mode }, { entity_id: id });
  };

  const markers = () => {
    const ct = currentTemp();
    return ct == null ? [] : [ct];
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Temperature control */}
      <div class="space-y-3">
        <Show
          when={temps().length > 0}
          fallback={
            <div class="text-center text-muted-foreground text-sm">
              No setpoint available in this mode
            </div>
          }
        >
          <Show when={currentTemp() !== undefined}>
            <div class="text-center text-muted-foreground text-sm">
              Now {formatTemperature(currentTemp(), tempUnit())}
            </div>
          </Show>

          <Slider
            value={temps()}
            min={minTemp()}
            max={maxTemp()}
            step={tempStep()}
            minStepsBetweenThumbs={isRange() ? 1 : undefined}
            thumbColors={isRange() ? [COOL, HEAT] : undefined}
            fillTone={isRange() ? ([COOL, HEAT] as [string, string]) : undefined}
            markers={markers()}
            onChange={setpointState.setPending}
            onChangeEnd={setpointState.commitValues}
            aria-label="Target temperature"
          />

          <div class="flex justify-center gap-8">
            <For each={setpoints()}>
              {(sp) => (
                <div class="flex flex-col items-center gap-1">
                  <span class="font-medium text-xs" style={{ color: sp.color }}>
                    {sp.label}
                  </span>
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setpointState.stepValue(sp.index, -tempStep())}
                      class="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                    >
                      <Icon icon="mdi:minus" width={20} />
                    </button>
                    <span class="min-w-[3.5rem] text-center font-bold text-2xl">
                      {formatTemperature(sp.value, tempUnit())}
                    </span>
                    <button
                      type="button"
                      onClick={() => setpointState.stepValue(sp.index, tempStep())}
                      class="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                    >
                      <Icon icon="mdi:plus" width={20} />
                    </button>
                  </div>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      <div class="h-px bg-border" />

      {/* HVAC mode selector */}
      <div class="space-y-2">
        <span class="font-medium text-sm">Mode</span>
        <ModeChips
          modes={hvacModes()}
          active={hvacMode()}
          info={HVAC_MODES}
          fallbackIcon="mdi:help"
          onSelect={callModeService("set_hvac_mode", "hvac_mode")}
        />
      </div>

      {/* Fan mode selector */}
      <Show when={fanModes()}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Fan</span>
          <ModeChips
            modes={fanModes() ?? []}
            active={fanMode()}
            info={FAN_MODES}
            fallbackIcon="mdi:fan"
            onSelect={callModeService("set_fan_mode", "fan_mode")}
          />
        </div>
      </Show>

      {/* Preset mode selector */}
      <Show when={presetModes()}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Preset</span>
          <ModeChips
            modes={presetModes() ?? []}
            active={presetMode()}
            capitalize
            onSelect={callModeService("set_preset_mode", "preset_mode")}
          />
        </div>
      </Show>
    </div>
  );
}
