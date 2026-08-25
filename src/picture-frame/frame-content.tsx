import { useWidgetDimensions } from "@glasshome/widget-sdk";
import { Show } from "solid-js";
import type { PictureFit } from "./types";

export function FrameContent(props: {
  src: string;
  objectFit: PictureFit;
  caption?: string;
  dotsBelow?: boolean;
  onFailed: () => void;
}) {
  const dimensions = useWidgetDimensions();
  const compact = () => dimensions().height > 0 && dimensions().height < 140;

  const captionPadding = () => {
    const bottom = props.dotsBelow ? "pb-5" : compact() ? "pb-1.5" : "pb-2.5";
    return compact() ? `px-2.5 pt-5 ${bottom}` : `px-3.5 pt-8 ${bottom}`;
  };

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
            class={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent ${captionPadding()}`}
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
