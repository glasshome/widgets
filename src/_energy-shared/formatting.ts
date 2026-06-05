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

export function describeFlow(state: FlowState, locale = "en-US"): string {
  const solar = state.solarW ?? 0;
  const gridImport = state.gridImportW ?? 0;
  const gridExport = state.gridExportW ?? 0;
  const batteryDischarge = state.batteryDischargeW ?? 0;
  const home = state.homeW ?? 0;

  const anyActivity =
    solar > 50 || gridImport > 50 || gridExport > 50 || batteryDischarge > 50;

  if (state.solarSleeping && !anyActivity) {
    return "Solar is resting until sunrise";
  }
  if (gridExport > 50) {
    return `Sending ${formatPower(gridExport, locale)} to the grid`;
  }
  if (solar > 50 && solar >= home) {
    return "Solar is powering your home";
  }
  if (batteryDischarge > 50 && batteryDischarge >= gridImport) {
    return "Running on battery";
  }
  if (solar > 50 && gridImport > 50) {
    return "Solar and grid are powering your home";
  }
  if (gridImport > 50) {
    return `Using ${formatPower(gridImport, locale)} from the grid`;
  }
  return `Home using ${formatPower(home, locale)}`;
}
