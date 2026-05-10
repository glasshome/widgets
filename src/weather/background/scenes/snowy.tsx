import { For } from "solid-js";
import { streams } from "../seed";

const COUNT = 22;

interface SnowyProps {
  mixed?: boolean;
}

/** Depth-correlated flakes; outer translates Y, inner translates X — composes
 * cleanly without transform conflicts. `mixed` adds a few rain streaks for
 * snowy-rainy. */
export function SnowyScene(props: SnowyProps) {
  const [x, depth, sway, swayDelay] = streams(COUNT, 1, 2, 3, 4);

  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.72 0.025 230) 0%, oklch(0.82 0.02 220) 100%)",
        }}
      />
      <div
        class="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.30 0.02 250) 0%, oklch(0.42 0.02 240) 100%)",
        }}
      />

      <For each={x}>
        {(left, i) => {
          const d = depth[i()] ?? 0.5;
          const size = 3 + d * 8;
          const fallDur = 8 + (1 - d) * 8;
          const blur = (1 - d) * 1.5;
          const opac = 0.4 + d * 0.5;
          const swayDur = 3 + (sway[i()] ?? 0) * 2;
          return (
            <div
              class="absolute top-0"
              style={{
                left: `${left * 100}%`,
                width: `${size}px`,
                height: `${size}px`,
                animation: `snow-fall ${fallDur}s linear -${left * fallDur}s infinite`,
                "will-change": "transform",
              }}
            >
              <div
                class="rounded-full"
                style={{
                  width: "100%",
                  height: "100%",
                  background:
                    "radial-gradient(circle, white 30%, rgba(255,255,255,0.4) 70%, transparent)",
                  filter: `blur(${blur}px)`,
                  opacity: opac,
                  animation: `snow-sway ${swayDur}s ease-in-out ${(swayDelay[i()] ?? 0) * 3}s infinite`,
                  "will-change": "transform",
                }}
              />
            </div>
          );
        }}
      </For>

      <div
        class="absolute inset-x-0 bottom-0 h-3"
        style={{
          background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.5))",
          filter: "blur(2px)",
        }}
      />

      {props.mixed && <MixedRainStreaks />}

      <style>{`
        @keyframes snow-fall { from { transform: translateY(-10%); } to { transform: translateY(calc(100cqh + 20px)); } }
        @keyframes snow-sway { 0%,100% { transform: translateX(0); } 50% { transform: translateX(12px); } }
        @keyframes snow-rain-fall { from { transform: translateY(-20%); } to { transform: translateY(calc(100cqh + 30px)); } }
      `}</style>
    </>
  );
}

function MixedRainStreaks() {
  const [x, d, t, h] = streams(7, 21, 22, 23, 24);
  return (
    <div
      class="absolute inset-0"
      style={{ transform: "skewX(-9deg)", "transform-origin": "top center" }}
    >
      <For each={x}>
        {(left, i) => (
          <div
            class="absolute top-0 w-px"
            style={{
              left: `${left * 110 - 5}%`,
              height: `${14 + (h[i()] ?? 0) * 12}px`,
              background: "linear-gradient(180deg, transparent, rgba(220,235,250,0.6))",
              animation: `snow-rain-fall ${1.8 + (d[i()] ?? 0) * 0.5}s linear -${(t[i()] ?? 0) * 2}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>
    </div>
  );
}
