import { type EntityView, useService, useTemperatureUnit } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createSignal, For, onCleanup, Show } from "solid-js";
import { TempSlider } from "./temp-slider";
import { FAN_MODES, formatTemperature, HVAC_MODES } from "./utils";

interface ClimateControlsProps {
  entities: () => EntityView[];
}

// Cool / heat setpoint accents for the range slider (blue = cool-to, amber = heat-to).
const COOL = "oklch(0.68 0.15 235)";
const HEAT = "oklch(0.66 0.19 40)";

export function ClimateControls(props: ClimateControlsProps) {
  const { callService } = useService();
  let commitDebounce: ReturnType<typeof setTimeout> | undefined;
  let pendingGrace: ReturnType<typeof setTimeout> | undefined;
  // Optimistic setpoints held while editing plus a grace window after commit, so
  // the slider and readout never snap back to the stale HA attribute mid
  // round-trip. [low, high] in range mode, [target] otherwise.
  const [pendingTemps, setPendingTemps] = createSignal<number[] | null>(null);

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
  const temps = () => pendingTemps() ?? stateTemps();

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

  const round1 = (v: number) => Math.round(v * 10) / 10;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const commit = (values: number[]) => {
    const id = entityId();
    if (!id || values.length === 0) return;
    const data = isRange()
      ? { target_temp_low: values[0], target_temp_high: values[1] }
      : { temperature: values[0] };
    callService("climate" as any, "set_temperature" as any, data, { entity_id: id });
    if (pendingGrace) clearTimeout(pendingGrace);
    pendingGrace = setTimeout(() => setPendingTemps(null), 1500);
  };

  // Fine +/- on one setpoint; keeps low below high by at least one step in range.
  const stepSetpoint = (index: number, delta: number) => {
    const base = temps();
    if (base.length === 0) return;
    const next = base.slice();
    let v = clamp(round1(base[index] + delta), minTemp(), maxTemp());
    if (isRange()) {
      if (index === 0) v = Math.min(v, next[1] - tempStep());
      else v = Math.max(v, next[0] + tempStep());
    }
    next[index] = v;
    setPendingTemps(next);
    if (commitDebounce) clearTimeout(commitDebounce);
    commitDebounce = setTimeout(() => commit(next), 400);
  };

  onCleanup(() => {
    if (commitDebounce) clearTimeout(commitDebounce);
    if (pendingGrace) clearTimeout(pendingGrace);
  });

  const hvacMode = () => (entity()?.state ?? "off") as string;
  const hvacModes = () => (entity()?.attributes?.hvac_modes as string[] | undefined) ?? [];
  const fanModes = () => (entity()?.attributes?.fan_modes as string[] | undefined) ?? null;
  const fanMode = () => entity()?.attributes?.fan_mode as string | undefined;
  const presetModes = () => (entity()?.attributes?.preset_modes as string[] | undefined) ?? null;
  const presetMode = () => entity()?.attributes?.preset_mode as string | undefined;

  const setHvacMode = (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService("climate" as any, "set_hvac_mode" as any, { hvac_mode: mode }, { entity_id: id });
  };

  const setFanMode = (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService("climate" as any, "set_fan_mode" as any, { fan_mode: mode }, { entity_id: id });
  };

  const setPresetMode = (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService(
      "climate" as any,
      "set_preset_mode" as any,
      { preset_mode: mode },
      { entity_id: id },
    );
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

          <TempSlider
            values={temps()}
            min={minTemp()}
            max={maxTemp()}
            step={tempStep()}
            colors={isRange() ? [COOL, HEAT] : ["var(--primary)"]}
            fill={isRange() ? `linear-gradient(90deg, ${COOL}, ${HEAT})` : "var(--primary)"}
            currentTemp={currentTemp()}
            onInput={(v) => setPendingTemps(v)}
            onCommit={(v) => commit(v)}
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
                      onClick={() => stepSetpoint(sp.index, -tempStep())}
                      class="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                    >
                      <Icon icon="mdi:minus" width={20} />
                    </button>
                    <span class="min-w-[3.5rem] text-center font-bold text-2xl">
                      {formatTemperature(sp.value, tempUnit())}
                    </span>
                    <button
                      type="button"
                      onClick={() => stepSetpoint(sp.index, tempStep())}
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
        <div class="flex flex-wrap gap-2">
          <For each={hvacModes()}>
            {(mode) => {
              const info = () => HVAC_MODES[mode] ?? { icon: "mdi:help", label: mode };
              return (
                <button
                  type="button"
                  onClick={() => setHvacMode(mode)}
                  class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-colors"
                  classList={{
                    "bg-primary text-primary-foreground": hvacMode() === mode,
                    "bg-muted hover:bg-muted/80": hvacMode() !== mode,
                  }}
                >
                  <Icon icon={info().icon} width={16} />
                  {info().label}
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* Fan mode selector */}
      <Show when={fanModes()}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Fan</span>
          <div class="flex flex-wrap gap-2">
            <For each={fanModes()!}>
              {(mode) => {
                const info = () => FAN_MODES[mode] ?? { icon: "mdi:fan", label: mode };
                return (
                  <button
                    type="button"
                    onClick={() => setFanMode(mode)}
                    class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-colors"
                    classList={{
                      "bg-primary text-primary-foreground": fanMode() === mode,
                      "bg-muted hover:bg-muted/80": fanMode() !== mode,
                    }}
                  >
                    <Icon icon={info().icon} width={16} />
                    {info().label}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>

      {/* Preset mode selector */}
      <Show when={presetModes()}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Preset</span>
          <div class="flex flex-wrap gap-2">
            <For each={presetModes()!}>
              {(mode) => (
                <button
                  type="button"
                  onClick={() => setPresetMode(mode)}
                  class="rounded-lg px-3 py-1.5 font-medium text-xs capitalize transition-colors"
                  classList={{
                    "bg-primary text-primary-foreground": presetMode() === mode,
                    "bg-muted hover:bg-muted/80": presetMode() !== mode,
                  }}
                >
                  {mode}
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
