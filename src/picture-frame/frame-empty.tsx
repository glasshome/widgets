import { useWidgetDimensions } from "@glasshome/widget-sdk";
import { createMemo, createUniqueId, Show } from "solid-js";

export function FrameEmpty(props: { title: string; message: string }) {
  const dimensions = useWidgetDimensions();
  const showTitle = createMemo(() => {
    const d = dimensions();
    return d.width >= 130 && d.height >= 88;
  });
  const showMessage = createMemo(() => {
    const d = dimensions();
    return d.width >= 170 && d.height >= 128;
  });

  const large = createMemo(() => {
    const d = dimensions();
    return d.width >= 520 && d.height >= 380;
  });

  const skyId = createUniqueId();

  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <svg
        class="absolute inset-0 h-full w-full"
        viewBox="0 0 200 140"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--muted-foreground)" stop-opacity="0.24" />
            <stop offset="100%" stop-color="var(--muted-foreground)" stop-opacity="0.06" />
          </linearGradient>
        </defs>
        <rect width="200" height="140" fill={`url(#${skyId})`} />
        <circle cx="146" cy="40" r="17" fill="var(--foreground)" opacity="0.12" />
        <path
          d="M0 96 Q 52 60 100 92 T 200 76 L200 140 L0 140 Z"
          fill="var(--foreground)"
          opacity="0.1"
        />
        <path
          d="M0 118 Q 46 90 94 114 T 200 106 L200 140 L0 140 Z"
          fill="var(--foreground)"
          opacity="0.17"
        />
      </svg>

      <Show when={showTitle()}>
        <div
          class={`absolute inset-x-0 bottom-0 flex flex-col items-center gap-0.5 bg-gradient-to-t from-background/80 to-transparent px-3 text-center ${large() ? "pt-16 pb-8" : "pt-8 pb-3"}`}
        >
          <span class={`font-semibold text-foreground/85 ${large() ? "text-xl" : "text-sm"}`}>
            {props.title}
          </span>
          <Show when={showMessage()}>
            <span class={`text-muted-foreground ${large() ? "text-base" : "text-xs"}`}>
              {props.message}
            </span>
          </Show>
        </div>
      </Show>
    </div>
  );
}
