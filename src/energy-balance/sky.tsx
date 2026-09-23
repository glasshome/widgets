import { useDaylight, useWidgetDimensions } from "@glasshome/widget-sdk";
import { createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import dayArt from "./assets/sky-day.webp";
import duskArt from "./assets/sky-dusk.webp";
import nightArt from "./assets/sky-night.webp";
import { arcPoint, skyProgress, skyScene } from "./sun-path";
import "./sky.css";

const SAMPLES = 48;

export function SkyScene(props: { glow: number }) {
  const dims = useWidgetDimensions();
  const daylight = useDaylight();
  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    onCleanup(() => clearInterval(id));
  });

  const scene = () => skyScene(daylight().phase);
  const position = createMemo(() => {
    const d = daylight();
    return skyProgress(now(), d.phase === "day", d.progress);
  });
  const box = () => ({ width: dims().width, height: dims().height });
  const path = (from: number, to: number) => {
    const points: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const p = arcPoint(from + ((to - from) * i) / SAMPLES, box());
      points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return `M${points.join("L")}`;
  };
  const body = () => arcPoint(position().t, box());
  const isSun = () => position().body === "sun";

  return (
    <>
      <img src={dayArt} alt="" class="sky-photo" />
      <img
        src={duskArt}
        alt=""
        class="sky-photo sky-layer"
        data-visible={scene() === "dusk" || undefined}
      />
      <img
        src={nightArt}
        alt=""
        class="sky-photo sky-layer"
        data-visible={scene() === "night" || undefined}
      />
      <div class="sky-scrim" />
      <Show when={dims().width > 0}>
        <svg class="sky-arc" width={dims().width} height={dims().height} aria-hidden="true">
          <defs>
            <radialGradient id="sky-sun-glow">
              <stop offset="0%" stop-color="oklch(0.95 0.12 85)" stop-opacity="0.9" />
              <stop offset="100%" stop-color="oklch(0.85 0.16 70)" stop-opacity="0" />
            </radialGradient>
          </defs>
          <path d={path(0, 1)} class="sky-track" />
          <path d={path(0, position().t)} class="sky-trail" data-body={position().body} />
          <Show when={isSun()}>
            <circle
              cx={body().x}
              cy={body().y}
              r={16 + props.glow * 34}
              fill="url(#sky-sun-glow)"
            />
          </Show>
          <circle
            cx={body().x}
            cy={body().y}
            r={isSun() ? 8 : 6}
            class={isSun() ? "sky-sun" : "sky-moon"}
          />
        </svg>
      </Show>
    </>
  );
}
