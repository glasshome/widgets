import { type EntityView, Slider, Switch, useService } from "@glasshome/widget-sdk";
import { createSignal, onCleanup, Show } from "solid-js";
import { ModeChips } from "../common";

interface FanControlsProps {
  entities: () => EntityView[];
}

const DIRECTION_INFO: Record<string, { icon: string; label: string }> = {
  forward: { icon: "mdi:rotate-right", label: "Forward" },
  reverse: { icon: "mdi:rotate-left", label: "Reverse" },
};

export function FanControls(props: FanControlsProps) {
  const { callService } = useService();

  const entity = () => props.entities()[0];
  const entityId = () => entity()?.id;

  const percentage = () => entity()?.attributes?.percentage as number | undefined;
  const percentageStep = () => entity()?.attributes?.percentage_step as number | undefined;
  const supportsSpeed = () => percentage() !== undefined || percentageStep() !== undefined;
  const presetModes = () => (entity()?.attributes?.preset_modes as string[] | undefined) ?? [];
  const presetMode = () => entity()?.attributes?.preset_mode as string | undefined;
  const oscillating = () => entity()?.attributes?.oscillating as boolean | undefined;
  const currentDirection = () => entity()?.attributes?.current_direction as string | undefined;

  const [localPct, setLocalPct] = createSignal(percentage() ?? 0);
  const [editing, setEditing] = createSignal(false);
  let speedDebounce: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (speedDebounce) clearTimeout(speedDebounce);
  });

  const shownPct = () => (editing() ? localPct() : (percentage() ?? 0));

  const handleSpeedChange = (values: number[]) => {
    const value = values[0];
    setEditing(true);
    setLocalPct(value);
    if (speedDebounce) clearTimeout(speedDebounce);
    speedDebounce = setTimeout(() => {
      setEditing(false);
      for (const e of props.entities()) {
        // Round so 100 stays reachable on fractional grids (e.g. step 100/3 tops
        // out at 99.99); HA ceils to the nearest ordered speed either way.
        callService(
          "fan",
          "set_percentage",
          { percentage: Math.round(value) },
          { entity_id: e.id },
        );
      }
    }, 300);
  };

  const setPresetMode = (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService("fan", "set_preset_mode", { preset_mode: mode }, { entity_id: id });
  };

  const setOscillating = (value: boolean) => {
    const id = entityId();
    if (!id) return;
    callService("fan", "oscillate", { oscillating: value }, { entity_id: id });
  };

  const setDirection = (direction: string) => {
    const id = entityId();
    if (!id) return;
    callService("fan", "set_direction", { direction }, { entity_id: id });
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Speed */}
      <Show when={supportsSpeed()}>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Speed</span>
            <span class="text-muted-foreground text-sm">{Math.round(shownPct())}%</span>
          </div>
          <Slider
            value={[shownPct()]}
            min={0}
            max={100}
            step={percentageStep() ?? 1}
            onChange={handleSpeedChange}
            aria-label="Fan speed"
          />
        </div>
      </Show>

      {/* Preset */}
      <Show when={presetModes().length > 0}>
        <Show when={supportsSpeed()}>
          <div class="h-px bg-border" />
        </Show>
        <div class="space-y-2">
          <span class="font-medium text-sm">Preset</span>
          <ModeChips
            modes={presetModes()}
            active={presetMode()}
            capitalize
            onSelect={setPresetMode}
          />
        </div>
      </Show>

      {/* Oscillate */}
      <Show when={oscillating() !== undefined}>
        <div class="h-px bg-border" />
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm">Oscillate</span>
          <Switch checked={oscillating() === true} onChange={setOscillating} />
        </div>
      </Show>

      {/* Direction */}
      <Show when={currentDirection() !== undefined}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Direction</span>
          <ModeChips
            modes={["forward", "reverse"]}
            active={currentDirection()}
            info={DIRECTION_INFO}
            onSelect={setDirection}
          />
        </div>
      </Show>
    </div>
  );
}
