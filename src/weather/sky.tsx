import { useDaylight, useIntersectionPause, useReducedMotion } from "@glasshome/widget-sdk";
import { type Accessor, createSignal, For, onCleanup, Show } from "solid-js";
import landNight from "./assets/land-night.webp";
import landSummer from "./assets/land-summer.webp";
import landWinter from "./assets/land-winter.webp";
import nearNight from "./assets/near-night.webp";
import nearSummer from "./assets/near-summer.webp";
import nearWinter from "./assets/near-winter.webp";
import skyClear from "./assets/sky-clear.webp";
import skyCumulus from "./assets/sky-cumulus.webp";
import skyOvercast from "./assets/sky-overcast.webp";
import "./sky.css";

type Motion = "fall" | "drift";

interface Layer {
  motion: Motion;
  image: string;
  size: number;
  seconds: number;
  /** Start part-way through the loop, so layers never move in step. */
  offset: number;
  /** Seconds for the slow sideways gust or sway riding on top; 0 for none. */
  gust?: number;
  class?: string;
}

function scatter(n: number, salt: number): number[] {
  return Array.from({ length: n }, (_, i) => {
    const r = Math.sin((i + 1) * 12.9898 * salt) * 43758.5453;
    return r - Math.floor(r);
  });
}

// Marks stay inside the tile so a repeated tile never shows a seam.
function tile(size: number, count: number, salt: number, mark: (x: number, y: number) => string) {
  const xs = scatter(count, salt);
  const ys = scatter(count, salt + 7);
  const marks = xs.map((x, i) => mark(x * size, (ys[i] ?? 0) * size)).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${marks}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

const streak =
  (len: number, width: number, alpha: number, size: number) => (x: number, y: number) => {
    const top = Math.min(y, size - len - 1);
    return `<line x1="${x.toFixed(1)}" y1="${top.toFixed(1)}" x2="${x.toFixed(1)}" y2="${(top + len).toFixed(1)}" stroke="white" stroke-opacity="${alpha}" stroke-width="${width}" stroke-linecap="round"/>`;
  };

const dot = (r: number, alpha: number, size: number) => (x: number, y: number) =>
  `<circle cx="${Math.min(Math.max(x, r), size - r).toFixed(1)}" cy="${Math.min(Math.max(y, r), size - r).toFixed(1)}" r="${r}" fill="white" fill-opacity="${alpha}"/>`;

const gust = (len: number, alpha: number, size: number) => (x: number, y: number) => {
  const left = Math.min(x, size - len - 1);
  return `<line x1="${left.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(left + len).toFixed(1)}" y2="${y.toFixed(1)}" stroke="white" stroke-opacity="${alpha}" stroke-width="1" stroke-linecap="round"/>`;
};

const RAIN_FAR: Layer = {
  motion: "fall",
  image: tile(96, 8, 1, streak(10, 1, 0.3, 96)),
  size: 96,
  seconds: 1.13,
  offset: 0.21,
  gust: 9.7,
};
const RAIN_MID: Layer = {
  motion: "fall",
  image: tile(128, 6, 11, streak(16, 1.25, 0.42, 128)),
  size: 128,
  seconds: 0.83,
  offset: 0.57,
  gust: 7.3,
};
const RAIN_NEAR: Layer = {
  motion: "fall",
  image: tile(160, 5, 2, streak(24, 1.5, 0.55, 160)),
  size: 160,
  seconds: 0.61,
  offset: 0.38,
  gust: 5.9,
};
const POUR: Layer = {
  motion: "fall",
  image: tile(128, 14, 3, streak(26, 1.25, 0.5, 128)),
  size: 128,
  seconds: 0.47,
  offset: 0.73,
  gust: 4.3,
};
const SNOW_TINY: Layer = {
  motion: "fall",
  image: tile(200, 34, 9, dot(1, 0.55, 200)),
  size: 200,
  seconds: 13.1,
  offset: 0.44,
  gust: 7.7,
  class: "wx-sway",
};
const SNOW_FAR: Layer = {
  motion: "fall",
  image: tile(260, 30, 4, dot(1.5, 0.7, 260)),
  size: 260,
  seconds: 9.4,
  offset: 0.12,
  gust: 5.3,
  class: "wx-sway",
};
const SNOW_NEAR: Layer = {
  motion: "fall",
  image: tile(340, 12, 5, dot(3, 0.85, 340)),
  size: 340,
  seconds: 6.2,
  offset: 0.66,
  gust: 4.1,
  class: "wx-sway",
};
const HAIL: Layer = {
  motion: "fall",
  image: tile(120, 9, 6, dot(2.2, 0.9, 120)),
  size: 120,
  seconds: 0.71,
  offset: 0.3,
};
const WIND_HIGH: Layer = {
  motion: "drift",
  image: tile(220, 6, 7, gust(60, 0.4, 220)),
  size: 220,
  seconds: 2.4,
  offset: 0.5,
};
const WIND_LOW: Layer = {
  motion: "drift",
  image: tile(300, 5, 12, gust(90, 0.25, 300)),
  size: 300,
  seconds: 3.7,
  offset: 0.15,
};
const FOG_FRONT: Layer = {
  motion: "drift",
  image: "",
  size: 0,
  seconds: 43,
  offset: 0.3,
  class: "wx-fog",
};
const FOG_BACK: Layer = {
  motion: "drift",
  image: "",
  size: 0,
  seconds: 71,
  offset: 0.8,
  class: "wx-fog wx-fog-back",
};
const STARS = tile(220, 26, 8, dot(0.9, 0.8, 220));

const LAYERS: Record<string, Layer[]> = {
  rainy: [RAIN_FAR, RAIN_MID, RAIN_NEAR],
  pouring: [RAIN_FAR, RAIN_MID, POUR],
  lightning: [RAIN_FAR],
  "lightning-rainy": [RAIN_FAR, RAIN_MID, POUR],
  snowy: [SNOW_TINY, SNOW_FAR, SNOW_NEAR],
  "snowy-rainy": [RAIN_FAR, SNOW_FAR, SNOW_NEAR],
  hail: [RAIN_FAR, HAIL],
  windy: [WIND_LOW, WIND_HIGH],
  "windy-variant": [WIND_LOW, WIND_HIGH],
  fog: [FOG_BACK, FOG_FRONT],
};

const SKIES: Record<string, string> = {
  sunny: skyClear,
  "clear-night": skyClear,
  windy: skyClear,
  "windy-variant": skyClear,
  partlycloudy: skyCumulus,
};

const FLASHES = new Set(["lightning", "lightning-rainy"]);

/** The still photos for a sky: one lookup so the scene and its frosted copy never disagree. */
function scenePhotos(condition: string, wintry: boolean, night: boolean) {
  const moonlit = night && !wintry;
  return {
    sky: SKIES[condition] ?? skyOvercast,
    land: wintry ? landWinter : moonlit ? landNight : landSummer,
    near: wintry ? nearWinter : moonlit ? nearNight : nearSummer,
    moonlit,
  };
}

/** The scene as seen through frosted glass: its photos blurred once, never animated. */
export function WeatherFrost(props: { condition: string; wintry: boolean; night: boolean }) {
  const photos = () => scenePhotos(props.condition, props.wintry, props.night);
  return (
    <div class="wx-frost" aria-hidden="true">
      <img src={photos().sky} alt="" />
      <img src={photos().land} alt="" />
      <img src={photos().near} alt="" />
    </div>
  );
}

function useDocumentHidden(): Accessor<boolean> {
  if (typeof document === "undefined") return () => false;
  const [hidden, setHidden] = createSignal(document.hidden);
  const onChange = () => setHidden(document.hidden);
  document.addEventListener("visibilitychange", onChange);
  onCleanup(() => document.removeEventListener("visibilitychange", onChange));
  return hidden;
}

/** Ambient motion rests offscreen, in a hidden tab and under reduced motion. */
export function useMotionPaused(el: Accessor<Element | undefined>): Accessor<boolean> {
  const reduced = useReducedMotion();
  const offscreen = useIntersectionPause(el);
  const hidden = useDocumentHidden();
  return () => reduced() || offscreen() || hidden();
}

export function WeatherSky(props: { condition: string; wintry: boolean }) {
  const daylight = useDaylight();
  const layers = () => LAYERS[props.condition] ?? [];
  const photos = () => scenePhotos(props.condition, props.wintry, daylight().phase === "night");
  const sky = () => photos().sky;

  return (
    <div class="wx-sky" data-sky={props.condition} data-phase={daylight().phase}>
      <img src={sky()} alt="" class="wx-sky-photo" data-drift={sky() !== skyClear || undefined} />
      <div class="wx-sky-grade" />
      <div class="wx-stars" style={{ "background-image": STARS }} />
      <img src={photos().land} alt="" class="wx-land" />
      <div class="wx-haze" />
      <img src={photos().near} alt="" class="wx-land" />
      <div class="wx-grade" />
      <For each={layers()}>
        {(layer) => (
          <div
            class={[`wx-${layer.motion}`, layer.gust ? "wx-gusty" : "", layer.class ?? ""]
              .join(" ")
              .trim()}
            style={{
              "background-image": layer.image || undefined,
              "--wx-tile": `${layer.size}px`,
              "--wx-dur": `${layer.seconds}s`,
              "--wx-delay": `${-layer.offset * layer.seconds}s`,
              "--wx-gust": layer.gust ? `${layer.gust}s` : undefined,
            }}
          />
        )}
      </For>
      <Show when={FLASHES.has(props.condition)}>
        <div class="wx-flash" />
        <div class="wx-flash wx-flash-far" />
      </Show>
    </div>
  );
}
