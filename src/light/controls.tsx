import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
} from "@glasshome/ui/solid";
import { type EntityView, useService } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createSignal, For, Show } from "solid-js";
import { ColorWheel } from "./color-wheel";
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

  const [localHs, setLocalHs] = createSignal<[number, number] | null>(
    (firstEntity()?.attributes?.hs_color as [number, number] | undefined) ?? null,
  );
  let hsDebounce: ReturnType<typeof setTimeout> | undefined;

  const [localTemp, setLocalTemp] = createSignal(
    (firstEntity()?.attributes?.color_temp_kelvin as number | undefined) ?? 4000,
  );
  let tempDebounce: ReturnType<typeof setTimeout> | undefined;

  const supportsColor = () => {
    const modes = firstEntity()?.attributes?.supported_color_modes as string[] | undefined;
    return modes?.some((m) => ["hs", "rgb", "xy", "rgbw", "rgbww"].includes(m)) ?? false;
  };

  const supportsTemp = () => {
    const modes = firstEntity()?.attributes?.supported_color_modes as string[] | undefined;
    return modes?.includes("color_temp") ?? false;
  };

  const supportsWhiteChannel = () => {
    const modes = firstEntity()?.attributes?.supported_color_modes as string[] | undefined;
    return modes?.some((m) => m === "rgbw" || m === "rgbww") ?? false;
  };

  const EFFECT_SUPPORT_FLAG = 4;
  const supportsEffect = () => {
    const features = firstEntity()?.attributes?.supported_features as number | undefined;
    return ((features ?? 0) & EFFECT_SUPPORT_FLAG) !== 0;
  };

  const effectList = () => (firstEntity()?.attributes?.effect_list as string[] | undefined) ?? [];

  const currentEffect = () => (firstEntity()?.attributes?.effect as string | undefined) ?? null;

  const currentWhite = () => {
    const rgbw = firstEntity()?.attributes?.rgbw_color as
      | [number, number, number, number]
      | undefined;
    if (rgbw) return rgbw[3];
    const rgbww = firstEntity()?.attributes?.rgbww_color as
      | [number, number, number, number, number]
      | undefined;
    if (rgbww) return rgbww[3];
    return 0;
  };

  const whitePercent = () => Math.round((currentWhite() / 255) * 100);
  const [localWhite, setLocalWhite] = createSignal(whitePercent());
  let whiteDebounce: ReturnType<typeof setTimeout> | undefined;

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

  // ha-types generated LightTurnOnFields is incomplete (missing hs_color, wrong color_temp_kelvin type)
  const lightTurnOn = (data: Record<string, unknown>, entityId: string) =>
    callService("light" as any, "turn_on" as any, data as any, { entity_id: entityId });

  const setColor = (hs: [number, number]) => {
    for (const id of props.entities().map((e) => e.id)) {
      lightTurnOn({ hs_color: hs }, id);
    }
  };

  const setTemp = (kelvin: number) => {
    for (const id of props.entities().map((e) => e.id)) {
      lightTurnOn({ color_temp_kelvin: kelvin }, id);
    }
  };

  const setWhite = () => {
    for (const id of props.entities().map((e) => e.id)) {
      if (supportsWhiteChannel()) {
        lightTurnOn({ rgbw_color: [0, 0, 0, 255] }, id);
      } else {
        lightTurnOn({}, id);
      }
    }
  };

  const setWarmWhite = () => {
    for (const id of props.entities().map((e) => e.id)) {
      lightTurnOn({ color_temp_kelvin: minKelvin() }, id);
    }
  };

  const setEffect = (effect: string) => {
    for (const id of props.entities().map((e) => e.id)) {
      lightTurnOn({ effect }, id);
    }
  };

  const handleWhiteChange = (percent: number) => {
    setLocalWhite(percent);
    if (whiteDebounce) clearTimeout(whiteDebounce);
    whiteDebounce = setTimeout(() => {
      const w = Math.round((percent / 100) * 255);
      for (const id of props.entities().map((e) => e.id)) {
        const rgbw = firstEntity()?.attributes?.rgbw_color as
          | [number, number, number, number]
          | undefined;
        const rgb = rgbw ? [rgbw[0], rgbw[1], rgbw[2]] : [0, 0, 0];
        lightTurnOn({ rgbw_color: [...rgb, w] }, id);
      }
    }, 300);
  };

  const handleTempChange = (kelvin: number) => {
    setLocalTemp(kelvin);
    if (tempDebounce) clearTimeout(tempDebounce);
    tempDebounce = setTimeout(() => {
      setTemp(kelvin);
    }, 300);
  };

  const handleHsChange = (hs: [number, number]) => {
    setLocalHs(hs);
    if (hsDebounce) clearTimeout(hsDebounce);
    hsDebounce = setTimeout(() => {
      setColor(hs);
    }, 100);
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
    <div class="flex flex-col gap-6">
      {/* Brightness */}
      <div class="space-y-2.5">
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

      {/* Color */}
      <Show when={supportsColor()}>
        <div class="flex flex-col gap-4">
          <span class="font-medium text-sm">Color</span>
          <ColorWheel
            value={localHs()}
            onChange={handleHsChange}
            onChangeEnd={(hs) => setColor(hs)}
          />
          {/* Quick-access presets */}
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={setWhite}
              class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border bg-white transition-transform active:scale-95"
              title="White"
            >
              <Icon icon="mdi:white-balance-sunny" width={14} class="text-gray-600" />
            </button>
            <button
              type="button"
              onClick={setWarmWhite}
              class="flex h-9 w-9 items-center justify-center rounded-full border-2 border-border transition-transform active:scale-95"
              style={{ "background-color": "hsl(35, 100%, 60%)" }}
              title="Warm White"
            >
              <Icon icon="mdi:candle" width={14} class="text-amber-900" />
            </button>
            <For each={COLOR_PRESETS}>
              {(preset) => (
                <button
                  type="button"
                  onClick={() => {
                    setColor([...preset.hs]);
                    setLocalHs([...preset.hs]);
                  }}
                  class="h-9 w-9 rounded-full border-2 transition-transform active:scale-95"
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

      {/* White Channel */}
      <Show when={supportsWhiteChannel()}>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">White Channel</span>
            <span class="text-muted-foreground text-sm">{localWhite()}%</span>
          </div>
          <Slider
            value={[localWhite()]}
            min={0}
            max={100}
            onChange={(values) => handleWhiteChange(values[0])}
            aria-label="White Channel"
          />
        </div>
      </Show>

      {/* Temperature */}
      <Show when={supportsTemp()}>
        <div class="flex flex-col gap-3">
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
          <div class="flex gap-1.5">
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
                    class="flex-1 rounded-lg px-2 py-2 font-medium text-xs transition-colors active:scale-[0.97]"
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

      {/* Effect */}
      <Show when={supportsEffect() && effectList().length > 0}>
        <div class="flex flex-col gap-3">
          <span class="font-medium text-sm">Effect</span>
          <Select
            value={currentEffect()}
            onChange={(value) => {
              if (value) setEffect(value);
            }}
            options={effectList()}
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>{itemProps.item.rawValue}</SelectItem>
            )}
          >
            <SelectTrigger class="w-full">
              <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent style={{ "max-height": "min(50vh, 20rem)", "overflow-y": "auto" }} />
          </Select>
        </div>
      </Show>
    </div>
  );
}
