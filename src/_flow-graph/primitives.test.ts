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

  test("scopes the stream gradient id per canvas (no cross-instance collision)", async () => {
    const src = await read("./FlowCanvas.tsx");
    expect(src).toContain("createUniqueId()");
    expect(src).toContain("id={streamId}");
  });
});

describe("Ribbon contracts", () => {
  test("omits the shine when idle, paused, or zero magnitude", async () => {
    const src = await read("./Ribbon.tsx");
    expect(src).toContain("!edge().idle && !props.paused && edge().magnitude > 0");
    expect(src).toContain("<Show when={animate()}>");
  });
});
