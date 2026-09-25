import { Show } from "solid-js";

interface VinylRecordProps {
  imageUrl?: string;
  isPlaying: boolean;
}

// Inline styles only: the record also draws in the panel, outside the widget's shadow root.
export function VinylRecord(props: VinylRecordProps) {
  return (
    <div
      style={{
        position: "relative",
        "aspect-ratio": "1",
        "border-radius": "50%",
        background:
          "repeating-radial-gradient(circle, #1a1a1a 0px, #1a1a1a 2px, #222 3px, #1a1a1a 4px)",
        animation: "vinyl-spin 8s linear infinite",
        "animation-play-state": props.isPlaying ? "var(--motion-play, running)" : "paused",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "13%",
          left: "13%",
          width: "74%",
          height: "74%",
          overflow: "hidden",
          "border-radius": "50%",
          background: props.imageUrl ? undefined : "oklch(0.37 0 0)",
        }}
      >
        <Show when={props.imageUrl}>
          <div
            style={{
              width: "100%",
              height: "100%",
              "background-image": `url(${props.imageUrl})`,
              "background-size": "cover",
              "background-position": "center",
            }}
          />
        </Show>
      </div>

      <div
        style={{
          position: "absolute",
          top: "47.5%",
          left: "47.5%",
          width: "5%",
          height: "5%",
          "border-radius": "50%",
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
