import { render } from "@solidjs/testing-library";
import type { EntityView } from "@glasshome/widget-sdk";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { describe, expect, test } from "vitest";
import { batteryPercent } from "../../src/batteries/utils";
import { BatteriesSheet } from "../../src/batteries/sheet";
import { deriveVerdict } from "../../src/electricity-grid/verdict";
import { gridLines, gridTileClass } from "../../src/electricity-grid/words";
import { formatPower } from "../../src/_energy-shared/formatting";
import { balanceReadout, balanceSubLine } from "../../src/energy-balance/words";
import { computeCost } from "../../src/energy-flow/cost";
import { buildEnergyGraph, resolveFlow } from "../../src/energy-flow/graph-adapter";
import { EnergyFlowSheet } from "../../src/energy-flow/sheet";
import { language } from "../catalog";

const tools = (dir: string, tag: "en" | "fr" | "de") => languageTools(language(dir, tag));

const unnamedSolar = (dir: string, tag: "en" | "fr") =>
  resolveFlow(
    [{ kind: "input", entities: ["sensor.solar"], label: "", icon: "", level: [] }],
    (id) => (id === "sensor.solar" ? 0 : null),
    true,
    tools(dir, tag),
  );

describe("energy-flow", () => {
  test("energy-flow labels an unnamed solar node in French", () => {
    const flow = unnamedSolar("energy-flow", "fr");
    expect(flow.nodes[0]?.label).toBe(tools("energy-flow", "fr").t("energy-flow.node.input"));
    const view = buildEnergyGraph(flow, tools("energy-flow", "fr")).views.get("node-0");
    expect(view?.value).toBe(tools("energy-flow", "fr").t("energy-flow.node.resting"));
  });

  test("energy-flow labels an unnamed solar node in English", () => {
    const flow = unnamedSolar("energy-flow", "en");
    expect(flow.nodes[0]?.label).toBe("Input");
    expect(buildEnergyGraph(flow, tools("energy-flow", "en")).views.get("node-0")?.value).toBe(
      "Back at sunrise",
    );
  });

  test("energy-flow words a cost sentence as one German message", () => {
    const de = tools("energy-flow", "de");
    const saving = computeCost({ solarW: 3000 }, { currency: "€", rate: 0.3 });
    const earning = computeCost({ gridExportW: 2000 }, { currency: "€", rate: 0.3 });
    const flow = resolveFlow(
      [
        { kind: "input", entities: ["sensor.solar"], label: "Solar", icon: "", level: [] },
        {
          kind: "bidirectional",
          positive: ["sensor.in"],
          negative: ["sensor.out"],
          signed: [],
          signedOutbound: false,
          priced: true,
          label: "Grid",
          icon: "",
          level: [],
        },
      ],
      (id) => ({ "sensor.solar": 3000, "sensor.in": 0, "sensor.out": 2000 })[id] ?? null,
      false,
      de,
    );
    const views = buildEnergyGraph(flow, de, { currency: "€", rate: 0.3 }).views;
    expect(saving?.solarSavingPerHour).toBeGreaterThan(0);

    expect(earning?.gridPerHour).toBeLessThan(0);
    const amount = (n: number) =>
      de.t("energy.money", {
        currency: "€",
        amount: de.formatNumber(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      });
    expect(views.get("node-0")?.sub).toBe(de.t("energy-flow.cost.saves", { amount: amount(0.3) }));
    expect(views.get("node-1")?.sub).toBe(de.t("energy-flow.cost.earns", { amount: amount(0.6) }));
  });

  test("energy-flow sheet reads German", () => {
    const de = language("energy-flow", "de");
    const flow = resolveFlow(
      [
        { kind: "input", entities: ["sensor.solar"], label: "Solar", icon: "", level: [] },
        { kind: "output", entities: [], remainder: true, label: "Home", icon: "", level: [] },
      ],
      (id) => (id === "sensor.solar" ? 0 : null),
      true,
      languageTools(de),
    );
    const view = render(() => (
      <WidgetLanguage {...de}>
        <EnergyFlowSheet flow={flow} tariff={{}} />
      </WidgetLanguage>
    ));
    const t = languageTools(de).t;
    expect(view.getByText(t("energy-flow.sheet.sources"))).toBeTruthy();
    expect(view.getByText(t("energy-flow.sheet.using-power"))).toBeTruthy();
    expect(view.getByText(t("energy-flow.node.resting"))).toBeTruthy();
  });
});

describe("energy-balance", () => {
  const input = {
    mode: "week",
    produced: 3200,
    consumed: 1000,
    unit: "W",
    hasSolar: true,
  } as const;

  test("energy-balance names its surplus in German from the select message", () => {
    const de = tools("energy-balance", "de");
    const readout = balanceReadout(de, input);
    expect(readout.caption).toBe(de.t("energy-balance.caption.surplus", { when: "week" }));
    expect(readout.value).toBe(`+${formatPower(2200, de)}`);
    expect(balanceSubLine(de, input)).toBe(
      de.t("energy-balance.sub", { solar: formatPower(3200, de), home: formatPower(1000, de) }),
    );
  });

  test("energy-balance writes kWh differences with a German decimal comma", () => {
    const de = tools("energy-balance", "de");
    const readout = balanceReadout(de, { ...input, unit: "kWh", produced: 4.2, consumed: 10.5 });
    expect(readout.value).toBe("−6,3");
    expect(readout.caption).toBe(de.t("energy-balance.caption.top-up", { when: "week" }));
  });

  test("energy-balance reads English with no catalog", () => {
    const en = tools("energy-balance", "en");
    expect(balanceReadout(en, input).caption).toBe("Solar surplus this week");
    expect(balanceReadout(en, { ...input, produced: 1000 }).value).toBe("Balanced");
  });
});

describe("electricity-grid", () => {
  const verdict = (tag: "en" | "de") => {
    const v = deriveVerdict(
      { fossilPct: 58, price: 0.1, cheapBelow: 0.2 },
      tools("electricity-grid", tag),
    );
    if (!v) throw new Error("no verdict");
    return v;
  };

  test("electricity grid reads its low-carbon share in German", () => {
    const de = tools("electricity-grid", "de");
    const lines = gridLines(de, { ...verdict("de"), lowCarbonPct: 42 }, 120.5);
    expect(lines.sub).toBe(de.t("electricity-grid.low-carbon", { percent: 42 }));
    expect(lines.co2).toBe(de.t("electricity-grid.co2", { value: "120,5" }));
    expect(lines.eyebrow).toBe(
      `${de.t("electricity-grid.price-note.cheap").charAt(0).toUpperCase()}${de.t("electricity-grid.price-note.cheap").slice(1)}`,
    );
  });

  test("electricity grid picks its tile class from the band, not the words", () => {
    for (const band of ["clean", "mixed", "dirty"] as const) {
      const en = deriveVerdict(
        { fossilPct: { clean: 20, mixed: 60, dirty: 90 }[band], price: null, cheapBelow: null },
        tools("electricity-grid", "en"),
      );
      const de = deriveVerdict(
        { fossilPct: { clean: 20, mixed: 60, dirty: 90 }[band], price: null, cheapBelow: null },
        tools("electricity-grid", "de"),
      );
      expect(en?.band).toBe(band);
      expect(gridTileClass(de?.band ?? "dirty")).toBe(gridTileClass(en?.band ?? "dirty"));
    }
    expect(gridTileClass("clean")).toBe("grid-tile grid-two-words");
    expect(gridTileClass("dirty")).toBe("grid-tile");
  });

  test("electricity grid reads English with no catalog", () => {
    const en = tools("electricity-grid", "en");
    const v = verdict("en");
    expect(v.phrase).toBe("Okay time");
    expect(gridLines(en, v, 120.5)).toEqual({
      eyebrow: "Cheap now",
      sub: "42% low-carbon",
      co2: "120.5 g/kWh",
    });
  });
});

describe("batteries", () => {
  const battery = (id: string, level: number, state = String(level)) => ({
    entity: { id, friendlyName: id, state } as unknown as EntityView,
    level,
    isAvailable: state !== "unavailable",
    isLow: level < 20,
  });

  test("batteries show 12,5 % in German", () => {
    expect(batteryPercent(tools("batteries", "de"), 12.5)).toBe(
      new Intl.NumberFormat("de", { style: "percent", maximumFractionDigits: 1 }).format(0.125),
    );
  });

  test("batteries sheet reads German from its catalog", () => {
    const de = language("batteries", "de");
    const t = languageTools(de).t;
    const view = render(() => (
      <WidgetLanguage {...de}>
        <BatteriesSheet
          batteries={[battery("sensor.a", 12.5), battery("sensor.b", 0, "unavailable")]}
          threshold={15}
        />
      </WidgetLanguage>
    ));
    expect(view.getByText(t("batteries.sheet.overview"))).toBeTruthy();
    expect(view.getByText(t("batteries.sheet.below", { threshold: 15 }))).toBeTruthy();
    const percent = batteryPercent(languageTools(de), 12.5);
    expect(
      view.getByText((_, el) => el?.textContent === percent && el.children.length === 0),
    ).toBeTruthy();
    expect(view.getAllByText(t("batteries.sheet.not-reporting")).length).toBe(2);
  });

  test("batteries sheet reads English with no catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("batteries", "en")}>
        <BatteriesSheet batteries={[battery("sensor.a", 12.5)]} threshold={15} />
      </WidgetLanguage>
    ));
    expect(view.getByText("Below 15%")).toBeTruthy();
    expect(view.getByText("12.5%")).toBeTruthy();
  });
});
