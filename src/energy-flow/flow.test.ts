import { describe, expect, test } from "bun:test";
import {
  aggregate,
  allStale,
  isIdle,
  isUnconfigured,
  type ResolvedFlow,
  type ResolvedNode,
  toFlowState,
} from "./flow";

function node(overrides: Partial<ResolvedNode>): ResolvedNode {
  return {
    id: "node-0",
    kind: "input",
    label: "Input",
    icon: "mdi:lightning-bolt",
    color: "red",
    configured: true,
    stale: false,
    watts: 0,
    direction: "idle",
    remainder: false,
    priced: false,
    resting: false,
    ...overrides,
  };
}

function flowOf(nodes: ResolvedNode[], hubW = 0): ResolvedFlow {
  return { nodes, hubW, flowState: toFlowState(nodes) };
}

describe("aggregate", () => {
  test("splits flows by kind and priced flag", () => {
    const agg = aggregate([
      node({ kind: "input", watts: 2000, direction: "in" }),
      node({ kind: "bidirectional", priced: true, watts: 500, direction: "in" }),
      node({ kind: "bidirectional", priced: false, watts: 300, direction: "out" }),
      node({ kind: "output", watts: 2200, direction: "out" }),
    ]);
    expect(agg).toEqual({
      productionW: 2000,
      pricedInW: 500,
      pricedOutW: 0,
      storageInW: 0,
      storageOutW: 300,
      consumptionW: 2200,
    });
  });

  test("idle nodes contribute nothing", () => {
    const agg = aggregate([node({ kind: "bidirectional", watts: 400, direction: "idle" })]);
    expect(agg.storageInW).toBe(0);
    expect(agg.storageOutW).toBe(0);
  });
});

describe("toFlowState", () => {
  test("maps aggregates onto the legacy roles", () => {
    const state = toFlowState([
      node({ kind: "input", watts: 2000, direction: "in" }),
      node({ kind: "bidirectional", priced: true, watts: 800, direction: "out" }),
      node({ kind: "bidirectional", priced: false, watts: 300, direction: "in" }),
      node({ kind: "output", watts: 1500, direction: "out" }),
    ]);
    expect(state.solarW).toBe(2000);
    expect(state.gridExportW).toBe(800);
    expect(state.gridImportW).toBe(0);
    expect(state.batteryDischargeW).toBe(300);
    expect(state.homeW).toBe(1500);
  });

  test("solarSleeping only when every configured input rests", () => {
    const both = [
      node({ kind: "input", resting: true }),
      node({ id: "node-1", kind: "input", resting: false }),
    ];
    expect(toFlowState(both).solarSleeping).toBe(false);
    expect(toFlowState([node({ kind: "input", resting: true })]).solarSleeping).toBe(true);
    expect(toFlowState([]).solarSleeping).toBe(false);
  });
});

describe("flow predicates", () => {
  test("isUnconfigured when no node is configured", () => {
    expect(isUnconfigured(flowOf([]))).toBe(true);
    expect(isUnconfigured(flowOf([node({ configured: false })]))).toBe(true);
    expect(isUnconfigured(flowOf([node({})]))).toBe(false);
  });

  test("allStale ignores the sensor-less remainder node", () => {
    const stale = node({ stale: true });
    const remainder = node({ id: "node-1", kind: "output", remainder: true });
    expect(allStale(flowOf([stale, remainder]))).toBe(true);
    expect(allStale(flowOf([stale, node({ id: "node-2" })]))).toBe(false);
    expect(allStale(flowOf([]))).toBe(false);
  });

  test("isIdle needs every node and the hub below the threshold", () => {
    expect(isIdle(flowOf([node({ watts: 20, direction: "in" })], 30))).toBe(true);
    expect(isIdle(flowOf([node({ watts: 500, direction: "in" })], 30))).toBe(false);
    expect(isIdle(flowOf([node({ watts: 500, direction: "idle" })], 600))).toBe(false);
    expect(isIdle(flowOf([node({ watts: 500, direction: "idle" })], 0))).toBe(true);
  });
});
