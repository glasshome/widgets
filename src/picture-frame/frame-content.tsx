import { useWidgetDimensions } from "@glasshome/widget-sdk";
import { Show } from "solid-js";
import type { PictureFit } from "./types";

export function FrameContent(props: {
  src: string;
  objectFit: PictureFit;
  caption?: string;
  onFailed: () => void;
}) {
  const dimensions = useWidgetDimensions();
  const compact = () => dimensions().height > 0 && dimensions().height < 140;

  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <img
        src={props.src}
        alt={props.caption ?? ""}
        class="absolute inset-0 h-full w-full"
        style={{ "object-fit": props.objectFit }}
        onError={props.onFailed}
      />
      <Show when={props.caption}>
        {(caption) => (
          <div
            class={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent ${
              compact() ? "px-2.5 pt-5 pb-1.5" : "px-3.5 pt-8 pb-2.5"
            }`}
          >
            <p
              class={`truncate font-medium text-white drop-shadow-sm ${
                compact() ? "text-[11px]" : "text-sm"
              }`}
            >
              {caption()}
            </p>
          </div>
        )}
      </Show>
    </div>
  );
}
