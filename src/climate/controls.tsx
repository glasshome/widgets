import { type EntityView, useService, useTemperatureUnit } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createSignal, For, Show } from "solid-js";
import { FAN_MODES, formatTemperature, HVAC_MODES } from "./utils";

interface ClimateControlsProps {
  entities: () => EntityView[];
}

export function ClimateControls(props: ClimateControlsProps) {
  const { callService } = useService();
  let tempDebounce: ReturnType<typeof setTimeout> | undefined;
  const [pendingTemp, setPendingTemp] = createSignal<number | null>(null);

  const entity = () => props.entities()[0];
  const entityId = () => entity()?.id;

  const currentTemp = () => entity()?.attributes?.current_temperature as number | undefined;
  const targetTemp = () => {
    const p = pendingTemp();
    if (p !== null) return p;
    return entity()?.attributes?.temperature as number | undefined;
  };
  const tempStep = () => (entity()?.attributes?.target_temp_step as number | undefined) ?? 0.5;
  const temperatureUnit = useTemperatureUnit();
  const tempUnit = () => {
    const unit = entity()?.attributes?.temperature_unit as string | undefined;
    return (unit ?? temperatureUnit()).replace("°", "");
  };

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

  const adjustTemp = (delta: number) => {
    const id = entityId();
    if (!id) return;
    const current = targetTemp() ?? 20;
    const newTemp = Math.round((current + delta) * 10) / 10;
    setPendingTemp(newTemp);
    if (tempDebounce) clearTimeout(tempDebounce);
    tempDebounce = setTimeout(() => {
      callService(
        "climate" as any,
        "set_temperature" as any,
        { temperature: newTemp },
        { entity_id: id },
      );
      setPendingTemp(null);
    }, 500);
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
      <div class="space-y-2">
        <span class="font-medium text-sm">Temperature</span>
        <div class="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => adjustTemp(-tempStep())}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <Icon icon="mdi:chevron-down" width={24} />
          </button>
          <div class="text-center">
            <div class="font-bold text-3xl">{formatTemperature(targetTemp(), tempUnit())}</div>
            <Show when={currentTemp() !== undefined}>
              <div class="text-muted-foreground text-sm">
                Current: {formatTemperature(currentTemp(), tempUnit())}
              </div>
            </Show>
          </div>
          <button
            type="button"
            onClick={() => adjustTemp(tempStep())}
            class="flex h-10 w-10 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
          >
            <Icon icon="mdi:chevron-up" width={24} />
          </button>
        </div>
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
