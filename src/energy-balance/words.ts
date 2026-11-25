import { type EnergyTools, formatPower } from "../_energy-shared/formatting";

export type Mode = "live" | "today" | "week" | "month";

export interface BalanceInput {
  mode: Mode;
  produced: number;
  consumed: number;
  unit: "W" | "kWh";
  hasSolar: boolean;
}

export interface Readout {
  value: string;
  unit: string;
  caption: string;
  tone: "surplus" | "draw" | "balanced";
}

const oneDecimal = (tools: EnergyTools, v: number) =>
  tools.formatNumber(v, { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const kwh = (tools: EnergyTools, v: number) => `${oneDecimal(tools, Math.round(v * 10) / 10)} kWh`;

export function balanceReadout(tools: EnergyTools, input: BalanceInput): Readout {
  const caption = (key: string) => tools.t(key, { when: input.mode });
  const balanced: Readout = {
    value: tools.t("energy-balance.balanced"),
    unit: "",
    caption: caption("energy-balance.caption.balanced"),
    tone: "balanced",
  };
  const surplus = caption("energy-balance.caption.surplus");
  const drawn = caption(
    input.hasSolar ? "energy-balance.caption.top-up" : "energy-balance.caption.from-grid",
  );
  if (input.unit === "W") {
    const diff = input.produced - input.consumed;
    if (Math.abs(diff) < 50) return balanced;
    if (diff > 0) {
      return { value: `+${formatPower(diff, tools)}`, unit: "", caption: surplus, tone: "surplus" };
    }
    return { value: `−${formatPower(-diff, tools)}`, unit: "", caption: drawn, tone: "draw" };
  }
  // Difference of the rounded values the bars display, so the header adds up.
  const pr = Math.round(input.produced * 10) / 10;
  const cr = Math.round(input.consumed * 10) / 10;
  const diff = Math.round((pr - cr) * 10) / 10;
  if (Math.abs(diff) < 0.05) return balanced;
  if (diff > 0) {
    return { value: `+${oneDecimal(tools, diff)}`, unit: "kWh", caption: surplus, tone: "surplus" };
  }
  return {
    value: `−${oneDecimal(tools, Math.abs(diff))}`,
    unit: "kWh",
    caption: drawn,
    tone: "draw",
  };
}

export function balanceSubLine(tools: EnergyTools, input: BalanceInput): string | undefined {
  if (!input.hasSolar) return undefined;
  const fmt = (v: number) => (input.unit === "W" ? formatPower(v, tools) : kwh(tools, v));
  return tools.t("energy-balance.sub", { solar: fmt(input.produced), home: fmt(input.consumed) });
}
