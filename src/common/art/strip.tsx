import "./strip.css";

/**
 * Object art rendered in Blender as a horizontal strip of frames (scripts/widget-art/blender).
 * Changing `end` steps through the frames: the first frame is the resting state, the last the other.
 */
export function ArtStrip(props: {
  strip: { src: string; frames: number; aspect: number };
  end: boolean;
}) {
  return (
    <div
      class="art-strip"
      data-end={props.end || undefined}
      style={{
        "aspect-ratio": String(props.strip.aspect),
        "--art-aspect": props.strip.aspect,
        "--strip-frames": props.strip.frames,
      }}
    >
      <img src={props.strip.src} alt="" />
    </div>
  );
}
