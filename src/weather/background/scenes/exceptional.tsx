import { For } from "solid-js";

const RING_DELAYS = [0, 2, 4, 6];

/** Severe-weather marker: warm corner glow + four staggered concentric
 * rings radiating from it. Reads as "alert" without being alarming. */
export function ExceptionalScene() {
  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.32 0.06 30) 0%, oklch(0.22 0.04 20) 100%)",
        }}
      />
      <div
        class="absolute inset-0 opacity-20"
        style={{
          background:
            "radial-gradient(circle at 80% 15%, rgba(255,180,80,0.5), transparent 50%)",
          "mix-blend-mode": "overlay",
        }}
      />

      <For each={RING_DELAYS}>
        {(delay) => (
          <div
            class="absolute rounded-full border border-amber-300/40"
            style={{
              right: "10%",
              top: "12%",
              width: "20%",
              "aspect-ratio": "1",
              animation: `warn-ring 8s ease-out ${delay}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>

      <style>{`
        @keyframes warn-ring { 0% { transform: scale(0.5); opacity: 0.8; } 100% { transform: scale(4); opacity: 0; } }
      `}</style>
    </>
  );
}
