import type { PictureFit } from "./types";

export function FrameContent(props: { src: string; objectFit: PictureFit; onFailed: () => void }) {
  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <img
        src={props.src}
        alt=""
        class="absolute inset-0 h-full w-full"
        style={{ "object-fit": props.objectFit }}
        onError={props.onFailed}
      />
    </div>
  );
}
