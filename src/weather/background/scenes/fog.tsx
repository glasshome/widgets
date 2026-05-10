/**
 * Fog scene — base sky gradient, drifting wisps at TOP and BOTTOM only. The
 * vertical middle band (where widget text lives) stays clear so contrast is
 * preserved. Heavier veil at the ground line; light haze at the top.
 */
export function FogScene() {
  return (
    <>
      {/* Base sky — cool grey, no white wash */}
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #B8BCB6 0%, #9DA29B 55%, #828780 100%)",
        }}
      />
      <div
        class="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(180deg, #3A3D39 0%, #2E312D 55%, #232622 100%)",
        }}
      />

      {/* Drifting fog wisps — full-height layer masked transparent in the
          text zone so wisps appear at top + bottom without a hard seam. */}
      <div
        class="absolute -inset-x-1/4 inset-y-0"
        style={{
          background:
            "radial-gradient(ellipse 30% 50% at 18% 12%, rgba(255,255,255,0.5) 0%, transparent 70%), radial-gradient(ellipse 32% 45% at 65% 8%, rgba(255,255,255,0.45) 0%, transparent 70%), radial-gradient(ellipse 38% 55% at 22% 88%, rgba(255,255,255,0.55) 0%, transparent 70%), radial-gradient(ellipse 35% 50% at 70% 92%, rgba(255,255,255,0.5) 0%, transparent 70%)",
          filter: "blur(24px)",
          "mask-image":
            "linear-gradient(180deg, black 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 65%, black 100%)",
          "-webkit-mask-image":
            "linear-gradient(180deg, black 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.15) 65%, black 100%)",
          animation: "fog-drift 70s linear infinite",
          "will-change": "transform",
        }}
      />

      {/* Ground veil — solid haze hugging the bottom edge */}
      <div
        class="absolute inset-x-0 bottom-0 h-1/4 dark:hidden"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(220,224,218,0.55) 100%)",
        }}
      />
      <div
        class="absolute inset-x-0 bottom-0 h-1/4 hidden dark:block"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(40,44,38,0.6) 100%)",
        }}
      />

      <style>{`
        @keyframes fog-drift { from { transform: translateX(-12%); } to { transform: translateX(12%); } }
      `}</style>
    </>
  );
}
