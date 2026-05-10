/**
 * Warm sky → halo → rotating conic god-rays → chromatic sun core.
 * Animations are inline `style.animation` strings; keyframes live in this
 * file's local <style> block so the scene is self-contained.
 */
export function SunnyScene() {
  return (
    <>
      {/* Sunny is a daytime scene — sky stays pale regardless of theme. */}
      <div
        class="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, #6FB5D8 0%, #8FC8DC 55%, #ADD7DE 100%)",
        }}
      />

      <div
        class="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 78% 22%, rgba(255,236,180,0.85) 0%, rgba(255,180,90,0.4) 18%, transparent 55%)",
          "mix-blend-mode": "screen",
        }}
      />

      {/* Rays — static fan emanating from the sun, soft pulse only.
       *  A radial mask fades them out before they reach the widget edges so
       *  the conic doesn't extend across the whole canvas.  */}
      <div
        class="absolute inset-0"
        style={{
          background: `conic-gradient(from 0deg at 78% 22%,
            transparent 0deg, rgba(255,230,170,0.22) 4deg, transparent 12deg,
            transparent 30deg, rgba(255,230,170,0.16) 36deg, transparent 44deg,
            transparent 70deg, rgba(255,230,170,0.20) 78deg, transparent 86deg,
            transparent 130deg, rgba(255,230,170,0.14) 136deg, transparent 144deg,
            transparent 180deg, rgba(255,230,170,0.18) 188deg, transparent 196deg,
            transparent 240deg, rgba(255,230,170,0.16) 248deg, transparent 256deg,
            transparent 300deg, rgba(255,230,170,0.20) 308deg, transparent 316deg,
            transparent 360deg)`,
          "mask-image":
            "radial-gradient(circle at 78% 22%, black 0%, black 30%, transparent 70%)",
          "-webkit-mask-image":
            "radial-gradient(circle at 78% 22%, black 0%, black 30%, transparent 70%)",
          filter: "blur(1.5px)",
          "mix-blend-mode": "screen",
          animation: "sun-rays-pulse 6s ease-in-out infinite",
          "will-change": "opacity",
        }}
      />

      <div
        class="absolute"
        style={{
          right: "12%",
          top: "10%",
          width: "28%",
          "aspect-ratio": "1",
          background:
            "radial-gradient(circle, #FFFCE8 0%, #FFE899 25%, #FFB861 55%, rgba(255,140,80,0.4) 75%, transparent 100%)",
          filter: "blur(6px)",
          "mix-blend-mode": "screen",
        }}
      />

      <div
        class="absolute rounded-full"
        style={{
          right: "16%",
          top: "13%",
          width: "20%",
          "aspect-ratio": "1",
          background:
            "radial-gradient(circle, #FFFFFF 0%, #FFF4C2 40%, #FFB861 80%, transparent 100%)",
          filter: "blur(0.5px)",
          "box-shadow": "0 0 60px 20px rgba(255,200,100,0.4)",
        }}
      />

      <style>{`
        @keyframes sun-rays-pulse { 0%,100% { opacity: 0.6; } 50% { opacity: 1; } }
      `}</style>
    </>
  );
}
