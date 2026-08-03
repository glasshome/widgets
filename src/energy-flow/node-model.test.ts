import { describe, expect, test } from "bun:test";
import { type FlowNodeConfig, validateNodes } from "./node-model";

function input(entities: string[] = ["sensor.in"]): FlowNodeConfig {
  return { kind: "input", entities, level: [] };
}

function output(remainder = false, entities: string[] = ["sensor.out"]): FlowNodeConfig {
  return { kind: "output", entities: remainder ? [] : entities, remainder, level: [] };
}

function bidirectional(): FlowNodeConfig {
  return {
    kind: "bidirectional",
    positive: ["sensor.pos"],
    negative: [],
    signed: [],
    signedOutbound: false,
    priced: false,
    level: [],
  };
}

describe("validateNodes", () => {
  test("empty list is valid (unconfigured, not an error)", () => {
    expect(validateNodes([])).toEqual([]);
  });

  test("at most one remainder", () => {
    expect(validateNodes([input(), output(true), output(true)])).toEqual([
      "Only one node can be marked as the remainder.",
    ]);
    expect(validateNodes([input(), output(true)])).toEqual([]);
  });

  test("inputs need an output or two-way node to conserve", () => {
    expect(validateNodes([input()])).toEqual([
      "Add an output or two-way node so the flow has somewhere to go.",
    ]);
    expect(validateNodes([input(), bidirectional()])).toEqual([]);
    expect(validateNodes([input(), output()])).toEqual([]);
  });

  test("a remainder needs something feeding it", () => {
    expect(validateNodes([output(true)])).toEqual([
      "A remainder output needs at least one input or two-way node feeding it.",
    ]);
    expect(validateNodes([bidirectional(), output(true)])).toEqual([]);
  });

  test("output-only and single bidirectional lists stay legal (old degenerate configs)", () => {
    expect(validateNodes([output()])).toEqual([]);
    expect(validateNodes([output(), output()])).toEqual([]);
    expect(validateNodes([bidirectional()])).toEqual([]);
  });

  test("violations accumulate", () => {
    expect(validateNodes([output(true), output(true)])).toHaveLength(2);
  });
});
