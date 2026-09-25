import { Show } from "solid-js";
import type { PictureFit } from "./types";

export function FrameContent(props: { src: string; objectFit: PictureFit; onFailed: () => void }) {
  return (
    <div class="frame-photo">
      <Show when={props.objectFit === "contain"}>
        <img src={props.src} alt="" class="frame-fill" aria-hidden="true" />
      </Show>
      <img
        src={props.src}
        alt=""
        style={{ "object-fit": props.objectFit }}
        onError={props.onFailed}
      />
    </div>
  );
}
