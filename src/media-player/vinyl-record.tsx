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
          top: "43%",
          left: "43%",
          width: "14%",
          height: "14%",
          background: "oklch(0.13 0 0)",
          "box-shadow": "0 0 0 1px oklch(1 0 0 / 0.12), inset 0 1px 2px oklch(0 0 0 / 0.6)",
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
