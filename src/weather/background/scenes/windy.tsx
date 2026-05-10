import { For } from "solid-js";
import { streams } from "../seed";

const STREAK_COUNT = 8;
const DUST_COUNT = 12;

/** Wind shown via what it carries: an atmospheric sweep, blurred horizontal
 * streaks, and amber dust particles drifting across. */
export function WindyScene() {
  const [sY, sLen, sDur, sDelay] = streams(STREAK_COUNT, 1, 2, 3, 4);
  const [dY, dDur, dDelay] = streams(DUST_COUNT, 5, 6, 7);

  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.75 0.04 180) 0%, oklch(0.82 0.03 170) 100%)",
        }}
      />
      <div
        class="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.30 0.03 200) 0%, oklch(0.38 0.03 190) 100%)",
        }}
      />

      <div
        class="absolute inset-0 opacity-40"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(160,200,210,0.3) 30%, rgba(180,220,230,0.4) 50%, rgba(160,200,210,0.3) 70%, transparent 100%)",
          "mix-blend-mode": "overlay",
          animation: "wind-sweep 12s ease-in-out infinite",
          "will-change": "transform",
        }}
      />

      <For each={sY}>
        {(y, i) => (
          <div
            class="absolute h-px"
            style={{
              top: `${5 + y * 90}%`,
              width: `${40 + (sLen[i()] ?? 0) * 80}px`,
              left: "-20%",
              background:
                "linear-gradient(90deg, transparent, rgba(220,240,245,0.6), transparent)",
              filter: "blur(0.5px)",
              animation: `wind-streak ${2.5 + (sDur[i()] ?? 0) * 1.5}s ease-out -${(sDelay[i()] ?? 0) * 4}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>

      <For each={dY}>
        {(y, i) => (
          <div
            class="absolute h-[2px] w-[2px] rounded-full bg-amber-100/40"
            style={{
              top: `${y * 100}%`,
              left: "-5%",
              animation: `wind-dust ${4 + (dDur[i()] ?? 0) * 4}s linear -${(dDelay[i()] ?? 0) * 5}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>

      {/* Tree silhouette anchored bottom-right; trunk pivots, foliage sways
          a touch more for a layered windswept feel. */}
      <div
        class="pointer-events-none absolute"
        style={{
          right: "6%",
          bottom: "0",
          width: "26%",
          "aspect-ratio": "1 / 1.4",
          "transform-origin": "50% 100%",
          animation: "wind-tree-sway 4.5s ease-in-out infinite",
          "will-change": "transform",
          opacity: 0.65,
          color: "#0b1410",
        }}
      >
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="xMaxYMax meet"
          class="h-full w-full"
        >
          <title>Wind-blown tree</title>
          {/* Trunk: simple straight rectangle */}
          <rect x="46" y="78" width="8" height="62" rx="2" fill="currentColor" />
          {/* Canopy: single cartoon cloud-shape so trunk doesn't show through */}
          <g
            style={{
              "transform-origin": "50px 78px",
              animation: "wind-tree-foliage 4.5s ease-in-out infinite",
              "will-change": "transform",
            }}
          >
            <path
              d="M50 84
                 C28 86 10 76 10 58
                 C10 44 22 34 34 36
                 C34 18 52 12 60 24
                 C72 16 90 26 88 44
                 C96 54 94 76 78 82
                 C70 90 58 90 50 84 Z"
              fill="currentColor"
            />
          </g>
        </svg>
      </div>

      <style>{`
        @keyframes wind-sweep  { 0%,100% { transform: translateX(-5%); } 50% { transform: translateX(5%); } }
        @keyframes wind-streak { 0% { transform: translateX(0); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateX(150vw); opacity: 0; } }
        @keyframes wind-dust   { 0% { transform: translate(0,0); } 50% { transform: translate(60vw,-10px); } 100% { transform: translate(120vw,5px); } }
        @keyframes wind-tree-sway    { 0%,100% { transform: rotate(-1deg); } 50% { transform: rotate(2.5deg); } }
        @keyframes wind-tree-foliage { 0%,100% { transform: rotate(-1.5deg); } 50% { transform: rotate(3deg); } }
      `}</style>
    </>
  );
}
