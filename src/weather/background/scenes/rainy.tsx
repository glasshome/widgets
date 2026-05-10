import { For } from "solid-js";
import { streams } from "../seed";

export type RainIntensity = "rainy" | "pouring";

interface RainyProps {
  intensity?: RainIntensity;
}

const COUNTS: Record<RainIntensity, { far: number; mid: number; near: number; splash: number }> = {
  rainy: { far: 6, mid: 10, near: 16, splash: 6 },
  pouring: { far: 8, mid: 14, near: 22, splash: 8 },
};

/**
 * Three rain planes (far blurred + slow → near sharp + fast) inside a single
 * skewed wrapper that supplies the wind angle. Splashes hit the bottom edge.
 */
export function RainyScene(props: RainyProps) {
  const intensity = props.intensity ?? "rainy";
  const c = COUNTS[intensity];

  const [farX, farD, farT, farH] = streams(c.far, 1, 2, 3, 4);
  const [midX, midD, midT, midH] = streams(c.mid, 5, 6, 7, 8);
  const [nearX, nearD, nearT, nearH] = streams(c.near, 9, 10, 11, 12);
  const [splX, splD, splT] = streams(c.splash, 13, 14, 15);

  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            intensity === "pouring"
              ? "linear-gradient(180deg, oklch(0.18 0.03 245) 0%, oklch(0.25 0.03 235) 50%, oklch(0.20 0.02 240) 100%)"
              : "linear-gradient(180deg, oklch(0.25 0.02 240) 0%, oklch(0.32 0.03 230) 50%, oklch(0.28 0.02 235) 100%)",
        }}
      />
      <div
        class="absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.15 0.02 250) 0%, transparent 100%)",
        }}
      />

      <div
        class="absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(180,200,220,0.5), transparent 60%)",
          "mix-blend-mode": "overlay",
        }}
      />

      <div
        class="absolute inset-0"
        style={{ transform: "skewX(-9deg)", "transform-origin": "top center" }}
      >
        <For each={farX}>
          {(x, i) => (
            <div
              class="absolute top-0 w-px"
              style={{
                left: `${x * 110 - 5}%`,
                height: `${30 + (farH[i()] ?? 0) * 25}px`,
                background: "linear-gradient(180deg, transparent, rgba(190,210,230,0.4))",
                filter: "blur(2px)",
                opacity: 0.5,
                animation: `rain-fall ${3 + (farD[i()] ?? 0) * 0.8}s linear -${(farT[i()] ?? 0) * 3}s infinite`,
                "will-change": "transform",
              }}
            />
          )}
        </For>

        <For each={midX}>
          {(x, i) => (
            <div
              class="absolute top-0 w-px"
              style={{
                left: `${x * 110 - 5}%`,
                height: `${20 + (midH[i()] ?? 0) * 18}px`,
                background: "linear-gradient(180deg, transparent, rgba(220,235,250,0.7))",
                filter: "blur(0.5px)",
                animation: `rain-fall ${1.9 + (midD[i()] ?? 0) * 0.5}s linear -${(midT[i()] ?? 0) * 2}s infinite`,
                "will-change": "transform",
              }}
            />
          )}
        </For>

        <For each={nearX}>
          {(x, i) => (
            <div
              class="absolute top-0"
              style={{
                left: `${x * 110 - 5}%`,
                width: "1.5px",
                height: `${10 + (nearH[i()] ?? 0) * 10}px`,
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(255,255,255,0.85) 80%, white 100%)",
                animation: `rain-fall ${1.3 + (nearD[i()] ?? 0) * 0.4}s linear -${(nearT[i()] ?? 0) * 1.5}s infinite`,
                "will-change": "transform",
              }}
            />
          )}
        </For>
      </div>

      <div class="absolute inset-x-0 bottom-0 h-2">
        <For each={splX}>
          {(x, i) => (
            <div
              class="absolute bottom-0 h-px w-2 rounded-full bg-white/40"
              style={{
                left: `${x * 100}%`,
                animation: `rain-splash ${1.4 + (splD[i()] ?? 0) * 0.4}s linear ${(splT[i()] ?? 0) * 2}s infinite`,
                filter: "blur(0.5px)",
                "will-change": "transform",
              }}
            />
          )}
        </For>
      </div>

      <style>{`
        @keyframes rain-fall  { from { transform: translateY(-20%); } to { transform: translateY(calc(100cqh + 30px)); } }
        @keyframes rain-splash { 0%, 80% { transform: scale(0); opacity: 0; } 85% { transform: scale(1); opacity: 0.8; } 100% { transform: scale(2.5); opacity: 0; } }
      `}</style>
    </>
  );
}
