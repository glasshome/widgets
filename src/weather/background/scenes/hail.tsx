import { For } from "solid-js";
import { streams } from "../seed";

const COUNT = 14;

/** Solid spheres falling fast with squish-bounce on impact — the bounce is
 * what reads as "hail, not rain". */
export function HailScene() {
  const [x, dur, delay, size] = streams(COUNT, 1, 2, 3, 4);

  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.40 0.02 230) 0%, oklch(0.50 0.025 220) 100%)",
        }}
      />
      <div
        class="absolute inset-x-0 top-0 h-1/3"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.25 0.02 240) 0%, transparent 100%)",
        }}
      />

      <For each={x}>
        {(left, i) => {
          const s = 3 + (size[i()] ?? 0) * 3;
          const d = 0.9 + (dur[i()] ?? 0) * 0.4;
          return (
            <div
              class="absolute top-0 rounded-full"
              style={{
                left: `${left * 100}%`,
                width: `${s}px`,
                height: `${s}px`,
                background:
                  "radial-gradient(circle at 35% 35%, white 0%, rgba(220,235,250,0.9) 60%, rgba(180,200,220,0.7) 100%)",
                "box-shadow": "0 0 4px rgba(220,235,250,0.5)",
                animation: `hail-fall ${d}s linear -${(delay[i()] ?? 0) * d}s infinite`,
                "will-change": "transform",
              }}
            />
          );
        }}
      </For>

      <style>{`
        @keyframes hail-fall {
          0%   { transform: translateY(-10%) scaleY(1); }
          88%  { transform: translateY(100cqh) scaleY(1); }
          92%  { transform: translateY(calc(100cqh - 8px)) scaleY(0.7); }
          96%  { transform: translateY(calc(100cqh - 4px)) scaleY(1); }
          100% { transform: translateY(calc(100cqh + 20px)) scaleY(1); opacity: 0; }
        }
      `}</style>
    </>
  );
}
