import { type EntityView, useService, useTemperatureUnit } from "@glasshome/widget-sdk";
import { createMemo } from "solid-js";
import { useSetpoints } from "./use-setpoints";

const num = (v: unknown) => (typeof v === "number" ? v : undefined);

// Home Assistant's own defaults (7 and 35 °C), in the unit it would report them.
const HA_BOUNDS = { C: [7, 35], F: [44.6, 95] } as const;

/** One thermostat's setpoints, bounds and step, committed through climate.set_temperature. */
export function useThermostat(entity: () => EntityView | undefined) {
  const { callService } = useService();
  const systemUnit = useTemperatureUnit();

  const unit = createMemo(() => {
    const own = entity()?.attributes.temperature_unit as string | undefined;
    return (own ?? systemUnit()).replace("°", "");
  });
  const defaults = () => HA_BOUNDS[unit() === "F" ? "F" : "C"];
  const min = () => num(entity()?.attributes.min_temp) ?? defaults()[0];
  const max = () => num(entity()?.attributes.max_temp) ?? defaults()[1];
  const step = () => num(entity()?.attributes.target_temp_step) ?? (unit() === "F" ? 1 : 0.5);

  const stateValues = createMemo(() => {
    const a = entity()?.attributes;
    const low = num(a?.target_temp_low);
    const high = num(a?.target_temp_high);
    if (low !== undefined && high !== undefined) return [low, high];
    const t = num(a?.temperature);
    return t === undefined ? [] : [t];
  });

  const setpoints = useSetpoints({
    stateValues,
    min,
    max,
    step,
    commit: (values) => {
      const id = entity()?.id;
      if (!id) return;
      const data =
        values.length === 2
          ? { target_temp_low: values[0], target_temp_high: values[1] }
          : { temperature: values[0] };
      void callService("climate", "set_temperature", data, { entity_id: id });
    },
  });

  return {
    setpoints,
    min,
    max,
    step,
    unit,
    isRange: () => stateValues().length === 2,
  };
}

export type Thermostat = ReturnType<typeof useThermostat>;
