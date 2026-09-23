import { For } from "solid-js";
import { render } from "solid-js/web";
import { LampArt, type LampKind } from "../../src/common/art/lamp";

const q = new URLSearchParams(location.search);
const KINDS: LampKind[] = q.get("kinds")
  ? (q.get("kinds")?.split(",") as LampKind[])
  : ["table", "floor", "pendant", "desk", "mushroom", "ceiling", "sconce", "bulb"];
const CELL = Number(q.get("cell") ?? 170);
const STATES = [
  { on: true, b: 100, c: "oklch(0.86 0.12 80)" },
  { on: true, b: 35, c: "oklch(0.86 0.12 80)" },
  { on: true, b: 90, c: "oklch(0.7 0.22 300)" },
  { on: false, b: 0, c: "oklch(0.86 0.12 80)" },
];
const theme = new URLSearchParams(location.search).get("theme") ?? "dark";
render(
  () => (
    <div
      id="stage"
      style={{
        background: theme === "dark" ? "#16181d" : "#eceef2",
        padding: "24px",
        display: "grid",
        "grid-template-columns": `repeat(${STATES.length}, ${CELL * 1.3}px)`,
        gap: "16px",
        width: "max-content",
      }}
    >
      <For each={KINDS}>
        {(k) => (
          <For each={STATES}>
            {(s) => (
              <div
                style={{
                  height: `${CELL}px`,
                  display: "flex",
                  "justify-content": "center",
                  "align-items": "flex-end",
                  overflow: "hidden",
                  "border-radius": "20px",
                  background: theme === "dark" ? "#20242c" : "#f7f8fa",
                  padding: "18px",
                }}
              >
                <div style={{ height: `${CELL - 40}px` }}>
                  <LampArt kind={k} on={s.on} brightness={s.b} color={s.c} />
                </div>
              </div>
            )}
          </For>
        )}
      </For>
    </div>
  ),
  document.getElementById("app") ?? document.body,
);
document.documentElement.dataset.ready = "1";
