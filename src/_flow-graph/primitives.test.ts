import { describe, expect, test } from "bun:test";

// Source-literal contracts: the components are thin glue over the tested
// geometry/layout, but two invariants silently break rendering if regressed,
// so pin them here (the repo's no-testing-library pattern).

const read = (f: string) => Bun.file(new URL(f, import.meta.url)).text();

describe("FlowCanvas contracts", () => {
  test("uses Index (not For) for edges so the shine survives value ticks", async () => {
    const src = await read("./FlowCanvas.tsx");
    expect(src).toContain("<Index each={layout().edges}>");
    expect(src).not.toContain("<For each={layout().edges}>");
  });

  test("stream animation respects prefers-reduced-motion", async () => {
    const src = await read("./FlowCanvas.tsx");
    expect(src).toContain("@media (prefers-reduced-motion: reduce)");
    expect(src).toContain("animation: none");
  });
});

describe("Ribbon contracts", () => {
  test("omits the stream when idle, paused, or zero magnitude", async () => {
    const src = await read("./Ribbon.tsx");
    expect(src).toContain("!edge().idle && !props.paused && edge().magnitude > 0");
    expect(src).toContain("<Show when={animate()}>");
  });

  test("dash pattern sums to the loop period (seamless offset cycle)", async () => {
    const src = await read("./Ribbon.tsx");
    const dash = src.match(/STREAM_DASH = "(\d+) (\d+)"/);
    const period = src.match(/STREAM_PERIOD = (\d+)/);
    if (!dash || !period) throw new Error("stream constants not found");
    expect(Number(dash[1]) + Number(dash[2])).toBe(Number(period[1]));
  });
});
