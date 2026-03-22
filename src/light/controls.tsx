import { useService } from "@glasshome/sync-layer/solid";
import { Slider } from "@glasshome/ui/solid";
import type { EntityView } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createSignal, For, Show } from "solid-js";
import { COLOR_PRESETS, formatBrightness, getTempPresets, hsToCSS } from "./utils";

interface LightControlsProps {
  entities: () => EntityView[];
  brightness: () => number;
}

export function LightControls(props: LightControlsProps) {
  const { callService } = useService();
  const [localBrightness, setLocalBrightness] = createSignal(props.brightness());
  let brightnessDebounce: ReturnType<typeof setTimeout> | undefined;

  const firstEntity = () => props.entities()[0];

  const [localTemp, setLocalTemp] = createSignal(
    (firstEntity()?.attributes?.color_temp_kelvin as number | undefined) ?? 4000,
  );
  let tempDebounce: ReturnType<typeof setTimeout> | undefined;

  const supportsColor = () => {
    const modes = firstEntity()?.attributes?.supported_color_modes as string[] | undefined;
    return modes?.some((m) => m === "hs" || m === "rgb" || m === "xy") ?? false;
  };

  const supportsTemp = () => {
    const modes = firstEntity()?.attributes?.supported_color_modes as string[] | undefined;
    return modes?.includes("color_temp") ?? false;
  };

  const currentHs = () => {
    const hs = firstEntity()?.attributes?.hs_color as [number, number] | undefined;
    return hs ?? null;
  };

  const minKelvin = () =>
    (firstEntity()?.attributes?.min_color_temp_kelvin as number | undefined) ?? 2000;
  const maxKelvin = () =>
    (firstEntity()?.attributes?.max_color_temp_kelvin as number | undefined) ?? 6500;

  const isHsMatch = (preset: [number, number], current: [number, number] | null): boolean => {
    if (!current) return false;
    return Math.abs(preset[0] - current[0]) < 10 && Math.abs(preset[1] - current[1]) < 15;
  };

  const setColor = (hs: [number, number]) => {
    const ids = props.entities().map((e) => e.id);
    for (const id of ids) {
      callService("light" as any, "turn_on" as any, { hs_color: hs }, { entity_id: id });
    }
  };

  const setTemp = (kelvin: number) => {
    const ids = props.entities().map((e) => e.id);
    for (const id of ids) {
      callService(
        "light" as any,
        "turn_on" as any,
        { color_temp_kelvin: kelvin },
        { entity_id: id },
      );
    }
  };

  const setWhite = () => {
    const ids = props.entities().map((e) => e.id);
    for (const id of ids) {
      callService("light" as any, "turn_on" as any, {}, { entity_id: id });
    }
  };

  const setWarmWhite = () => {
    const ids = props.entities().map((e) => e.id);
    for (const id of ids) {
      callService(
        "light" as any,
        "turn_on" as any,
        { color_temp_kelvin: minKelvin() },
        { entity_id: id },
      );
    }
  };

  const handleTempChange = (kelvin: number) => {
    setLocalTemp(kelvin);
    if (tempDebounce) clearTimeout(tempDebounce);
    tempDebounce = setTimeout(() => {
      setTemp(kelvin);
    }, 300);
  };

  const handleBrightnessChange = (value: number) => {
    setLocalBrightness(value);
    if (brightnessDebounce) clearTimeout(brightnessDebounce);
    brightnessDebounce = setTimeout(() => {
      const ids = props.entities().map((e) => e.id);
      for (const id of ids) {
        callService("light" as any, "turn_on" as any, { brightness_pct: value }, { entity_id: id });
      }
    }, 300);
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Brightness slider */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm">Brightness</span>
          <span class="text-muted-foreground text-sm">{formatBrightness(localBrightness())}</span>
        </div>
        <Slider
          value={[localBrightness()]}
          min={1}
          max={100}
          onChange={(values) => handleBrightnessChange(values[0])}
          aria-label="Brightness"
        />
      </div>

      {/* Color presets */}
      <Show when={supportsColor()}>
        <div class="space-y-2">
          <span class="font-medium text-sm">Color</span>
          <div class="grid grid-cols-7 gap-2">
            {/* White preset */}
            <button
              type="button"
              onClick={setWhite}
              class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border bg-white transition-transform hover:scale-110"
              title="White"
            >
              <Icon icon="mdi:white-balance-sunny" width={14} class="text-gray-600" />
            </button>
            {/* Warm white preset */}
            <button
              type="button"
              onClick={setWarmWhite}
              class="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border transition-transform hover:scale-110"
              style={{ "background-color": "hsl(35, 100%, 60%)" }}
              title="Warm White"
            >
              <Icon icon="mdi:candle" width={14} class="text-amber-900" />
            </button>
            <For each={COLOR_PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => setColor([...preset.hs])}
                  class="relative h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
                  classList={{
                    "border-white ring-2 ring-primary": isHsMatch([...preset.hs], currentHs()),
                    "border-transparent": !isHsMatch([...preset.hs], currentHs()),
                  }}
                  style={{ "background-color": hsToCSS([...preset.hs]) }}
                  title={preset.name}
                />
              )}
            </For>
          </div>
        </div>
      </Show>

      {/* Temperature slider */}
      <Show when={supportsTemp()}>
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Temperature</span>
            <span class="text-muted-foreground text-sm">{localTemp()}K</span>
          </div>
          <Slider
            value={[localTemp()]}
            min={minKelvin()}
            max={maxKelvin()}
            step={50}
            onChange={(values) => handleTempChange(values[0])}
            aria-label="Color Temperature"
          />
        </div>
      </Show>

      {/* Temperature presets */}
      <Show when={supportsTemp()}>
        <div class="space-y-2">
          <span class="font-medium text-sm">Presets</span>
          <div class="flex gap-2">
            <For each={getTempPresets(minKelvin(), maxKelvin())}>
              {(preset) => {
                const currentTemp = () =>
                  firstEntity()?.attributes?.color_temp_kelvin as number | undefined;
                const isActive = () => {
                  const ct = currentTemp();
                  return ct !== undefined && Math.abs(ct - preset.kelvin) < 200;
                };
                return (
                  <button
                    type="button"
                    onClick={() => setTemp(preset.kelvin)}
                    class="flex-1 rounded-lg px-2 py-1.5 font-medium text-xs transition-colors"
                    classList={{
                      "bg-primary text-primary-foreground": isActive(),
                      "bg-muted hover:bg-muted/80": !isActive(),
                    }}
                  >
                    {preset.name}
                  </button>
                );
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
