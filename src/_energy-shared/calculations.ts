export type ConsumptionStrategy = "entity" | "grid_plus_solar" | "sum_consumers";

export type BidirectionalInput =
  | { importValue: number; exportValue: number }
  | { signed: number };

export interface NormalizedFlow {
  import: number;
  export: number;
}

export interface ConsumptionInputs {
  homeW?: number;
  grid?: BidirectionalInput;
  solarW?: number;
  battery?: BidirectionalInput;
  consumersW?: number[];
}

export function normalizeBidirectional(input: BidirectionalInput): NormalizedFlow {
  if ("signed" in input) {
    const signed = input.signed;
    // -0 must read as 0 on both sides.
    return {
      import: signed > 0 ? signed : 0,
      export: signed < 0 ? -signed : 0,
    };
  }
  return {
    import: Math.max(0, input.importValue),
    export: Math.max(0, input.exportValue),
  };
}

export function calculateHomeConsumption(
  strategy: ConsumptionStrategy,
  inputs: ConsumptionInputs,
): number {
  switch (strategy) {
    case "entity":
      return inputs.homeW ?? 0;
    case "grid_plus_solar": {
      const grid = inputs.grid ? normalizeBidirectional(inputs.grid) : { import: 0, export: 0 };
      const battery = inputs.battery
        ? normalizeBidirectional(inputs.battery)
        : { import: 0, export: 0 };
      const solar = inputs.solarW ?? 0;
      const consumption =
        grid.import + solar - grid.export - battery.import + battery.export;
      // Sensor jitter can push this slightly negative; consumption can't be.
      return Math.max(0, consumption);
    }
    case "sum_consumers":
      return (inputs.consumersW ?? []).reduce((sum, w) => sum + w, 0);
  }
}
