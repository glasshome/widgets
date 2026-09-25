import { Show } from "solid-js";

interface VinylRecordProps {
  imageUrl?: string;
  isPlaying: boolean;
}

export function VinylRecord(props: VinylRecordProps) {
  return (
    <div
      class="relative aspect-square rounded-full"
      style={{
        background:
          "repeating-radial-gradient(circle, #1a1a1a 0px, #1a1a1a 2px, #222 3px, #1a1a1a 4px)",
        animation: "vinyl-spin 8s linear infinite",
        "animation-play-state": props.isPlaying ? "var(--motion-play, running)" : "paused",
      }}
    >
      {/* Album art center */}
      <div
        class="absolute rounded-full"
        style={{
          top: "13%",
          left: "13%",
          width: "74%",
          height: "74%",
          overflow: "hidden",
        }}
      >
        <Show
          when={props.imageUrl}
          fallback={<div class="h-full w-full rounded-full bg-neutral-700" />}
        >
          <div
            class="h-full w-full rounded-full"
            style={{
              "background-image": `url(${props.imageUrl})`,
              "background-size": "cover",
              "background-position": "center",
            }}
          />
        </Show>
      </div>

      {/* Center hole */}
      <div
        class="absolute rounded-full"
        style={{
          top: "47.5%",
          left: "47.5%",
          width: "5%",
          height: "5%",
          background: "oklch(0.13 0 0)",
          "box-shadow": "0 0 0 1.5px oklch(1 0 0 / 0.35)",
        }}
      />

      <style>{`
        @keyframes vinyl-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
