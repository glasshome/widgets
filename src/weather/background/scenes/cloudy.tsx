interface CloudyProps {
  partlyCloudy?: boolean;
}

/** Cartoon cloud silhouette (flat cloud, 3 humps on top). Aspect preserved. */
function Cloud(props: { class?: string; style?: Record<string, string | number> }) {
  return (
    <svg
      viewBox="0 0 120 50"
      preserveAspectRatio="xMidYMid meet"
      class={props.class}
      style={props.style}
      aria-hidden="true"
    >
      <path
        d="M14 44
           L90 44
           C104 44 104 30 90 28
           C94 16 76 8 64 16
           C60 4 40 4 36 16
           C28 6 10 12 16 24
           C4 28 4 44 14 44 Z"
        fill="white"
      />
    </svg>
  );
}

/**
 * Cloudy scene — cartoon cloud silhouettes drifting across the upper third of
 * the sky. Confined high so cloud bodies never crowd foreground text. Three
 * parallax planes (far/mid/near) with size + speed differences.
 */
export function CloudyScene(props: CloudyProps) {
  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background: props.partlyCloudy
            ? "linear-gradient(180deg, oklch(0.78 0.05 230) 0%, oklch(0.85 0.04 220) 100%)"
            : "linear-gradient(180deg, oklch(0.65 0.02 230) 0%, oklch(0.72 0.02 220) 100%)",
        }}
      />
      <div
        class="absolute inset-0 hidden dark:block"
        style={{
          background: props.partlyCloudy
            ? "linear-gradient(180deg, oklch(0.32 0.04 240) 0%, oklch(0.40 0.03 230) 100%)"
            : "linear-gradient(180deg, oklch(0.25 0.02 240) 0%, oklch(0.32 0.02 230) 100%)",
        }}
      />

      {props.partlyCloudy && (
        <div
          class="absolute"
          style={{
            right: "12%",
            top: "10%",
            width: "20%",
            "aspect-ratio": "1",
            background: "radial-gradient(circle, rgba(255,225,170,0.65), transparent 70%)",
            filter: "blur(10px)",
          }}
        />
      )}

      <Cloud
        class="absolute opacity-60 dark:opacity-15"
        style={{
          top: "4%",
          left: "-40%",
          width: "38%",
          height: "16%",
          animation: "cloud-far 60s linear infinite",
          "will-change": "transform",
        }}
      />

      <Cloud
        class="absolute opacity-70 dark:opacity-15"
        style={{
          top: "14%",
          left: "-50%",
          width: "42%",
          height: "18%",
          animation: "cloud-mid 45s linear infinite",
          "will-change": "transform",
        }}
      />

      <Cloud
        class="absolute opacity-50 dark:opacity-15"
        style={{
          top: "8%",
          left: "-35%",
          width: "30%",
          height: "13%",
          animation: "cloud-near 30s linear infinite",
          "will-change": "transform",
        }}
      />

      <style>{`
        @keyframes cloud-far  { from { transform: translateX(0); } to { transform: translateX(380%); } }
        @keyframes cloud-mid  { from { transform: translateX(0); } to { transform: translateX(360%); } }
        @keyframes cloud-near { from { transform: translateX(0); } to { transform: translateX(450%); } }
      `}</style>
    </>
  );
}
