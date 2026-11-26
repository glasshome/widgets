import { fireEvent, render } from "@solidjs/testing-library";
import { createSignal, flush } from "solid-js";
import { describe, expect, test } from "vitest";
import { HeaderChips } from "../../src/header/chips";
import type { ResolvedChip } from "../../src/header/items";

const lights = (value: string, ids: string[] = ["light.a"]): ResolvedChip => ({
  label: "Turn off lights",
  icon: "mdi:lightbulb-on",
  tone: "text-warning",
  value,
  ids,
  service: { domain: "light", name: "turn_off" },
});
const temperature = (value: string): ResolvedChip => ({
  label: "Living room temperature",
  icon: "mdi:thermometer",
  value,
  ids: ["sensor.t"],
});
const locks = (value: string): ResolvedChip => ({
  label: "Lock doors",
  icon: "lucide:unlock",
  tone: "text-destructive/80",
  value,
  ids: ["lock.front"],
  service: { domain: "lock", name: "lock" },
});

function mount(initial: ResolvedChip[]) {
  const [chips, writeChips] = createSignal(initial);
  const setChips = (next: ResolvedChip[]) => {
    writeChips(next);
    flush();
  };
  const runs: Array<{ domain: string; name: string; ids: string[] }> = [];
  const view = render(() => (
    <HeaderChips
      chips={chips()}
      run={(service, ids) => runs.push({ domain: service.domain, name: service.name, ids })}
    />
  ));
  const nodes = () => [...view.container.querySelectorAll(".header-chip")];
  const values = () => nodes().map((node) => node.querySelector(".header-chip-value")?.textContent);
  return { chips, setChips, runs, nodes, values };
}

describe("HeaderChips", () => {
  test("a new array that changes one chip's value keeps every chip's DOM node", () => {
    const { setChips, nodes, values } = mount([lights("3"), temperature("21°"), locks("1")]);
    const before = nodes();
    expect(values()).toEqual(["3", "21°", "1"]);

    setChips([lights("3"), temperature("22°"), locks("1")]);

    const after = nodes();
    expect(after).toHaveLength(3);
    for (const [i, node] of before.entries()) expect(after[i]).toBe(node);
    expect(values()).toEqual(["3", "22°", "1"]);
  });

  test("keeps the other chips' own icon nodes when one value changes", () => {
    const { setChips, nodes } = mount([lights("3"), temperature("21°")]);
    const iconsOf = () => nodes().map((node) => node.querySelector("svg"));
    const icons = iconsOf();
    expect(icons.every((icon) => icon !== null)).toBe(true);
    setChips([lights("4"), temperature("21°")]);
    const after = iconsOf();
    for (const [i, icon] of icons.entries()) expect(after[i]).toBe(icon);
  });

  test("adds a chip at the end and drops from the end without touching the rest", () => {
    const { setChips, nodes, values } = mount([lights("3"), temperature("21°")]);
    const [first, second] = nodes();
    setChips([lights("3"), temperature("21°"), locks("1")]);
    expect(nodes().slice(0, 2)).toEqual([first, second]);
    expect(values()).toEqual(["3", "21°", "1"]);
    setChips([lights("3")]);
    expect(nodes()).toEqual([first]);
  });

  test("shows a chip without a value as an icon only", () => {
    const { setChips, values } = mount([{ ...lights("3"), value: null }]);
    expect(values()).toEqual([undefined]);
    setChips([lights("2")]);
    expect(values()).toEqual(["2"]);
    setChips([{ ...lights("2"), value: null }]);
    expect(values()).toEqual([undefined]);
  });

  test("a chip with a service is a button and one without is a plain span", () => {
    const { nodes } = mount([lights("3"), temperature("21°")]);
    const [action, reading] = nodes();
    expect(action?.tagName).toBe("BUTTON");
    expect(action?.getAttribute("aria-label")).toBe("Turn off lights");
    expect(reading?.tagName).toBe("SPAN");
    expect(reading?.className).toContain("cursor-default");
  });

  test("pressing a chip runs its own service with the ids it holds after an update", () => {
    const { setChips, nodes, runs } = mount([lights("1", ["light.a"]), locks("1")]);
    setChips([lights("2", ["light.a", "light.b"]), locks("1")]);
    const [first, second] = nodes();
    if (first) fireEvent.click(first);
    if (second) fireEvent.click(second);
    expect(runs).toEqual([
      { domain: "light", name: "turn_off", ids: ["light.a", "light.b"] },
      { domain: "lock", name: "lock", ids: ["lock.front"] },
    ]);
  });

  test("pressing a chip without a service runs nothing", () => {
    const { nodes, runs } = mount([temperature("21°")]);
    const [reading] = nodes();
    if (reading) fireEvent.click(reading);
    expect(runs).toEqual([]);
  });

  test("a position that changes from an action to a reading becomes a span in place", () => {
    const { setChips, nodes, runs } = mount([lights("3")]);
    expect(nodes()[0]?.tagName).toBe("BUTTON");
    setChips([temperature("21°")]);
    const [reading] = nodes();
    expect(reading?.tagName).toBe("SPAN");
    expect(reading?.getAttribute("aria-label")).toBe("Living room temperature");
    if (reading) fireEvent.click(reading);
    expect(runs).toEqual([]);
  });

  test("a position that changes kind carries the attributes of a chip mounted as that kind", () => {
    const attributes = (node: Element | undefined) =>
      Object.fromEntries([...(node?.attributes ?? [])].map((a) => [a.name, a.value]));
    const freshReading = attributes(mount([temperature("21°")]).nodes()[0]);
    const freshAction = attributes(mount([lights("3")]).nodes()[0]);

    const toReading = mount([lights("3")]);
    toReading.setChips([temperature("21°")]);
    expect(attributes(toReading.nodes()[0])).toEqual(freshReading);

    const toAction = mount([temperature("21°")]);
    toAction.setChips([lights("3")]);
    expect(attributes(toAction.nodes()[0])).toEqual(freshAction);
  });
});
