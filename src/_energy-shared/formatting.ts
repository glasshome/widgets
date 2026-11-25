import type { TranslationTools } from "@glasshome/widget-sdk";

export type EnergyTools = Pick<TranslationTools, "t" | "formatNumber">;

export interface FlowState {
  solarW?: number;
  gridImportW?: number;
  gridExportW?: number;
  batteryChargeW?: number;
  batteryDischargeW?: number;
  homeW?: number;
  solarSleeping?: boolean;
}

function scaled(value: number, decimals: number, tools: EnergyTools): string {
  return tools.formatNumber(value, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPower(watts: number, tools: EnergyTools): string {
  const abs = Math.abs(watts);
  if (abs < 1000) {
    return `${scaled(Math.round(watts), 0, tools)} W`;
  }
  const kw = watts / 1000;
  if (abs >= 10000) {
    return `${scaled(Math.round(kw), 0, tools)} kW`;
  }
  return `${scaled(kw, 1, tools)} kW`;
}

export function formatEnergy(wh: number, tools: EnergyTools): string {
  const abs = Math.abs(wh);
  if (abs < 1000) {
    return `${scaled(Math.round(wh), 0, tools)} Wh`;
  }
  const kwh = wh / 1000;
  if (abs >= 10000) {
    return `${scaled(Math.round(kwh), 0, tools)} kWh`;
  }
  return `${scaled(kwh, 1, tools)} kWh`;
}

export function describePower(label: string, watts: number, tools: EnergyTools): string {
  return tools.t("energy.labelled-power", { label, power: formatPower(watts, tools) });
}

// Magnitude only: callers phrase the sign as costs or earns.
export function formatMoney(amount: number, currency: string, tools: EnergyTools): string {
  return tools.t("energy.money", { currency, amount: scaled(Math.abs(amount), 2, tools) });
}

export interface FlowDescription {
  headline: string;
  detail: string;
}

const THRESHOLD = 50;

// Rules run in priority order: a headline never names a minority source while a larger one is active.
export function describeFlow(state: FlowState, tools: EnergyTools): FlowDescription {
  const { t } = tools;
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
    // Don't credit solar unless it's actually running and covers home plus what we export.
    const solarCoversExport = solarActive && solar >= home + gridExport;
    let detail = t("energy.flow.pushing-back");
    if (solarCoversExport) {
      detail = t("energy.flow.solar-covers-everything");
    } else if (batteryDischarging && !solarActive) {
      detail = t("energy.flow.battery-to-grid");
    }
    return {
      headline: t("energy.flow.to-grid", { power: formatPower(gridExport, tools) }),
      detail,
    };
  }
  if (solar >= home && solarActive && !batteryDischarging) {
    return {
      headline: t("energy.flow.on-solar"),
      detail: batteryCharging ? t("energy.flow.charging-battery") : t("energy.flow.grid-untouched"),
    };
  }
  if (solarActive && batteryDischarging && !importing) {
    return {
      headline: t("energy.flow.solar-and-battery"),
      detail: t("energy.flow.grid-untouched"),
    };
  }
  if (batteryDischarging && !solarActive) {
    return { headline: t("energy.flow.on-battery"), detail: t("energy.flow.grid-untouched") };
  }
  if (solarActive && importing) {
    return {
      headline: t("energy.flow.solar-and-grid"),
      detail: t("energy.flow.solar-covers-part"),
    };
  }
  if (importing) {
    return {
      headline: t("energy.flow.from-grid", { power: formatPower(gridImport, tools) }),
      detail: state.solarSleeping ? t("energy.flow.solar-resting") : "",
    };
  }
  // Nothing flowing and home draw is negligible: calmer than "Home using 0 W".
  if (home <= THRESHOLD) {
    return { headline: t("energy.flow.all-quiet"), detail: "" };
  }
  return { headline: t("energy.flow.home-using", { power: formatPower(home, tools) }), detail: "" };
}
