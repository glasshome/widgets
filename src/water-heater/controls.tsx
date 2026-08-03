import { Slider, Switch } from "@glasshome/ui/solid";
import { type EntityView, useService, useTemperatureUnit } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { Show } from "solid-js";
import { formatTemperature, ModeChips, useSetpoints } from "../common";
import { OPERATION_MODES } from "./utils";

interface WaterHeaterControlsProps {
  entities: () => EntityView[];
}

// A water heater only heats: the setpoint wears the warm heat accent
// (same value as the climate widget's heat-to setpoint).
const HEAT = "oklch(0.66 0.19 40)";

export function WaterHeaterControls(props: WaterHeaterControlsProps) {
  const { callService } = useService();

  const entity = () => props.entities()[0];
  const entityId = () => entity()?.id;

  const currentTemp = () => entity()?.attributes?.current_temperature as number | undefined;
  const targetTemp = () => entity()?.attributes?.temperature as number | undefined;
  const temperatureUnit = useTemperatureUnit();
  const tempUnit = () => temperatureUnit().replace("°", "");
  // The water_heater domain exposes no target_temp_step; mirror the HA
  // frontend default of 1°F / 0.5°C.
  const tempStep = () => (tempUnit() === "F" ? 1 : 0.5);
  // Fallbacks are HA's water_heater DEFAULT_MIN_TEMP/DEFAULT_MAX_TEMP.
  const minTemp = () =>
    (entity()?.attributes?.min_temp as number | undefined) ?? (tempUnit() === "F" ? 110 : 43);
  const maxTemp = () =>
    (entity()?.attributes?.max_temp as number | undefined) ?? (tempUnit() === "F" ? 140 : 60);

  const setpointState = useSetpoints({
    stateValues: () => {
      const t = targetTemp();
      return t == null ? [] : [t];
    },
    min: minTemp,
    max: maxTemp,
    step: tempStep,
    commit: (values) => {
      const id = entityId();
      if (!id || values.length === 0) return;
      callService("water_heater", "set_temperature", { temperature: values[0] }, { entity_id: id });
    },
  });
  const temps = setpointState.values;

  const operationMode = () => (entity()?.state ?? "off") as string;
  const operationList = () => (entity()?.attributes?.operation_list as string[] | undefined) ?? [];
  // The away_mode attribute is the string "on"/"off"; the service field is boolean.
  const awayMode = () => entity()?.attributes?.away_mode as string | undefined;

  const setOperationMode = (mode: string) => {
    const id = entityId();
    if (!id) return;
    callService("water_heater", "set_operation_mode", { operation_mode: mode }, { entity_id: id });
  };

  const setAwayMode = (away: boolean) => {
    const id = entityId();
    if (!id) return;
    callService("water_heater", "set_away_mode", { away_mode: away }, { entity_id: id });
  };

  const markers = () => {
    const ct = currentTemp();
    return ct == null ? [] : [ct];
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Target temperature */}
      <div class="space-y-3">
        <Show
          when={temps().length > 0}
          fallback={
            <div class="text-center text-muted-foreground text-sm">No target temperature</div>
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
            thumbColors={[HEAT]}
            fillTone={HEAT}
            markers={markers()}
            onChange={setpointState.setPending}
            onChangeEnd={setpointState.commitValues}
            aria-label="Target temperature"
          />

          <div class="flex justify-center">
            <div class="flex flex-col items-center gap-1">
              <span class="font-medium text-xs" style={{ color: HEAT }}>
                Target
              </span>
              <div class="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setpointState.stepValue(0, -tempStep())}
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                >
                  <Icon icon="mdi:minus" width={20} />
                </button>
                <span class="min-w-[3.5rem] text-center font-bold text-2xl">
                  {formatTemperature(temps()[0], tempUnit())}
                </span>
                <button
                  type="button"
                  onClick={() => setpointState.stepValue(0, tempStep())}
                  class="flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors hover:bg-muted/80"
                >
                  <Icon icon="mdi:plus" width={20} />
                </button>
              </div>
            </div>
          </div>
        </Show>
      </div>

      {/* Operation mode selector */}
      <Show when={operationList().length > 0}>
        <div class="h-px bg-border" />
        <div class="space-y-2">
          <span class="font-medium text-sm">Mode</span>
          <ModeChips
            modes={operationList()}
            active={operationMode()}
            info={OPERATION_MODES}
            fallbackIcon="mdi:water-boiler"
            onSelect={setOperationMode}
          />
        </div>
      </Show>

      {/* Away mode */}
      <Show when={awayMode() !== undefined}>
        <div class="h-px bg-border" />
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm">Away mode</span>
          <Switch checked={awayMode() === "on"} onChange={setAwayMode} />
        </div>
      </Show>
    </div>
  );
}
