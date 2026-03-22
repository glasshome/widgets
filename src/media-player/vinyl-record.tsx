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
        animation: "vinyl-spin 3s linear infinite",
        "animation-play-state": props.isPlaying ? "running" : "paused",
      }}
    >
      {/* Album art center */}
      <div
        class="absolute rounded-full"
        style={{
          top: "30%",
          left: "30%",
          width: "40%",
          height: "40%",
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
        class="absolute rounded-full bg-neutral-900"
        style={{
          top: "47%",
          left: "47%",
          width: "6%",
          height: "6%",
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
