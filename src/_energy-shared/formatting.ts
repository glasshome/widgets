export interface FlowState {
  solarW?: number;
  gridImportW?: number;
  gridExportW?: number;
  batteryChargeW?: number;
  batteryDischargeW?: number;
  homeW?: number;
  solarSleeping?: boolean;
}

function formatNumber(value: number, locale: string, decimals: number): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatPower(watts: number, locale = "en-US"): string {
  const abs = Math.abs(watts);
  if (abs < 1000) {
    return `${formatNumber(Math.round(watts), locale, 0)} W`;
  }
  const kw = watts / 1000;
  if (abs >= 10000) {
    return `${formatNumber(Math.round(kw), locale, 0)} kW`;
  }
  return `${formatNumber(kw, locale, 1)} kW`;
}

export function formatEnergy(wh: number, locale = "en-US"): string {
  const abs = Math.abs(wh);
  if (abs < 1000) {
    return `${formatNumber(Math.round(wh), locale, 0)} Wh`;
  }
  const kwh = wh / 1000;
  if (abs >= 100000) {
    return `${formatNumber(Math.round(kwh), locale, 0)} kWh`;
  }
  return `${formatNumber(kwh, locale, 1)} kWh`;
}

export function describePower(label: string, watts: number, locale = "en-US"): string {
  return `${label}: ${formatPower(watts, locale)}`;
}

export interface FlowDescription {
  headline: string;
  detail: string;
}

const THRESHOLD = 50;

/**
 * Headline + secondary line describing the current flow. Rules are evaluated in
 * priority order; a headline never names a minority source while a larger one is
 * active (so battery never headlines while solar out-contributes it).
 */
export function describeFlow(state: FlowState, locale = "en-US"): FlowDescription {
  const solar = state.solarW ?? 0;
  const gridImport = state.gridImportW ?? 0;
  const gridExport = state.gridExportW ?? 0;
  const batteryCharge = state.batteryChargeW ?? 0;
  const batteryDischarge = state.batteryDischargeW ?? 0;
  const home = state.homeW ?? 0;

  const solarActive = solar > THRESHOLD;
  const batteryDischarging = batteryDischarge > THRESHOLD;
  const batteryCharging = batteryCharge > THRESHOLD;
  const importing = gridImport > THRESHOLD;

  if (gridExport > THRESHOLD) {
    return {
      headline: `Sending ${formatPower(gridExport, locale)} to the grid`,
      detail: "Solar is covering everything",
    };
  }
  if (solar >= home && solarActive && !batteryDischarging) {
    return {
      headline: "Solar is powering your home",
      detail: batteryCharging ? "Charging the battery" : "Grid untouched",
    };
  }
  if (solarActive && batteryDischarging && !importing) {
    return {
      headline: "Solar and battery are powering your home",
      detail: "Grid untouched",
    };
  }
  if (batteryDischarging && !solarActive) {
    return { headline: "Running on battery", detail: "Grid untouched" };
  }
  if (solarActive && importing) {
    return {
      headline: "Solar and grid are powering your home",
      detail: "Solar is covering part of it",
    };
  }
  if (importing) {
    return {
      headline: `Using ${formatPower(gridImport, locale)} from the grid`,
      detail: state.solarSleeping ? "Solar is resting until sunrise" : "",
    };
  }
  return { headline: `Home using ${formatPower(home, locale)}`, detail: "" };
}
