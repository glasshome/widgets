import { For } from "solid-js";
import { streams } from "../seed";

interface LightningProps {
  withRain?: boolean;
}

/** Storm clouds + branching SVG bolts on different cycles + sky-wide flash.
 * `withRain` overlays a few rain streaks for lightning-rainy. */
export function LightningScene(props: LightningProps) {
  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.18 0.04 280) 0%, oklch(0.12 0.05 290) 60%, oklch(0.08 0.03 270) 100%)",
        }}
      />

      <div
        class="absolute -top-8 -inset-x-8 h-2/3 opacity-90"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 30% 70%, oklch(0.15 0.03 270) 0%, transparent 70%), radial-gradient(ellipse 50% 70% at 75% 60%, oklch(0.10 0.02 280) 0%, transparent 65%)",
          filter: "blur(20px)",
        }}
      />

      <svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id="bolt-glow">
            <feGaussianBlur stdDeviation="0.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M 55 0 L 50 22 L 58 24 L 42 50 L 50 52 L 38 80 M 50 22 L 38 30 M 42 50 L 32 58 L 36 62"
          stroke="white"
          stroke-width="0.4"
          fill="none"
          stroke-linecap="round"
          filter="url(#bolt-glow)"
          stroke-dasharray="200"
          stroke-dashoffset="200"
          style={{ animation: "bolt-strike 8s ease-out infinite" }}
        />
      </svg>

      <svg
        class="absolute inset-0 h-full w-full opacity-60"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M 22 0 L 18 20 L 26 22 L 14 44 M 18 20 L 10 26"
          stroke="oklch(0.92 0.05 280)"
          stroke-width="0.3"
          fill="none"
          stroke-linecap="round"
          filter="url(#bolt-glow)"
          stroke-dasharray="120"
          stroke-dashoffset="120"
          style={{ animation: "bolt-strike 13s ease-out 3s infinite" }}
        />
      </svg>

      <div
        class="pointer-events-none absolute inset-0 bg-white"
        style={{
          "mix-blend-mode": "screen",
          animation: "sky-flash 8s ease-out infinite",
        }}
      />

      {props.withRain && <RainOverlay />}

      <style>{`
        @keyframes bolt-strike {
          0%, 92% { stroke-dashoffset: 200; opacity: 0; }
          93%     { stroke-dashoffset: 0;   opacity: 1; }
          95%     { opacity: 0.3; }
          96%     { opacity: 1; }
          98%     { opacity: 0; }
          100%    { stroke-dashoffset: 200; opacity: 0; }
        }
        @keyframes sky-flash {
          0%, 92% { opacity: 0; }
          93%     { opacity: 0.35; }
          94%     { opacity: 0.05; }
          95%     { opacity: 0.5; }
          97%     { opacity: 0; }
        }
        @keyframes lightning-rain-fall { from { transform: translateY(-20%); } to { transform: translateY(calc(100cqh + 30px)); } }
      `}</style>
    </>
  );
}

function RainOverlay() {
  const [x, t, h] = streams(14, 31, 32, 33);
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
              height: `${16 + (h[i()] ?? 0) * 14}px`,
              background: "linear-gradient(180deg, transparent, rgba(220,235,250,0.7))",
              animation: `lightning-rain-fall 1.5s linear -${(t[i()] ?? 0) * 1.5}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>
    </div>
  );
}
