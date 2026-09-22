import { createUniqueId, For, Show } from "solid-js";
import bulb from "./assets/lamp-bulb.webp";
import ceiling from "./assets/lamp-ceiling.webp";
import desk from "./assets/lamp-desk.webp";
import floor from "./assets/lamp-floor.webp";
import mushroom from "./assets/lamp-mushroom.webp";
import pendant from "./assets/lamp-pendant.webp";
import sconce from "./assets/lamp-sconce.webp";
import table from "./assets/lamp-table.webp";
import "./lamp.css";

export type LampKind = "table" | "floor" | "pendant" | "desk" | "mushroom" | "ceiling" | "sconce" | "bulb";

interface Emitter {
  x: number;
  y: number;
  rx: number;
  ry: number;
  core?: number;
}

interface Beam {
  x: number;
  y: number;
  angle: number;
  spread: number;
  half: number;
  length: number;
  floor?: boolean;
}

interface Lamp {
  src: string;
  w: number;
  h: number;
  emit: Emitter[];
  beams: Beam[];
  pool?: { x: number; y: number; rx: number };
  bloom: number;
  flip?: boolean;
}

const LAMPS: Record<LampKind, Lamp> = {
  table: {
    src: table,
    w: 247,
    h: 360,
    emit: [{ x: 50, y: 30, rx: 44, ry: 24, core: 0.9 }],
    beams: [
      { x: 50, y: 44, angle: 0, spread: 64, half: 100, length: 200, floor: true },
      { x: 50, y: 3, angle: 180, spread: 44, half: 42, length: 140 },
    ],
    bloom: 1.6,
  },
  floor: {
    src: floor,
    w: 91,
    h: 360,
    emit: [{ x: 50, y: 11, rx: 70, ry: 12 }],
    beams: [
      { x: 50, y: 16, angle: 0, spread: 56, half: 34, length: 300, floor: true },
      { x: 50, y: 1, angle: 180, spread: 50, half: 28, length: 120 },
    ],
    bloom: 2.4,
  },
  pendant: {
    src: pendant,
    w: 137,
    h: 360,
    emit: [{ x: 50, y: 85, rx: 46, ry: 16, core: 1 }],
    beams: [],
    bloom: 2.6,
  },
  desk: {
    src: desk,
    w: 295,
    h: 360,
    emit: [{ x: 85, y: 24, rx: 12, ry: 10, core: 1 }],
    beams: [{ x: 84, y: 26, angle: -36, spread: 46, half: 30, length: 300, floor: true }],
    flip: true,
    bloom: 1.2,
  },
  mushroom: {
    src: mushroom,
    w: 378,
    h: 360,
    emit: [
      { x: 50, y: 22, rx: 46, ry: 22, core: 0.8 },
      { x: 50, y: 68, rx: 14, ry: 30 },
    ],
    beams: [],
    pool: { x: 50, y: 99, rx: 80 },
    bloom: 1.5,
  },
  ceiling: {
    src: ceiling,
    w: 607,
    h: 360,
    emit: [
      { x: 50, y: 76, rx: 62, ry: 30, core: 1 },
      { x: 50, y: 42, rx: 70, ry: 50 },
    ],
    beams: [{ x: 50, y: 86, angle: 0, spread: 70, half: 270, length: 260 }],
    bloom: 1.2,
  },
  sconce: {
    src: sconce,
    w: 361,
    h: 360,
    emit: [{ x: 73, y: 34, rx: 34, ry: 40 }],
    beams: [
      { x: 73, y: 3, angle: 180, spread: 34, half: 70, length: 170 },
      { x: 72, y: 47, angle: 0, spread: 40, half: 26, length: 190 },
    ],
    bloom: 1.4,
  },
  bulb: {
    src: bulb,
    w: 195,
    h: 360,
    emit: [
      { x: 50, y: 40, rx: 18, ry: 16, core: 1 },
      { x: 50, y: 36, rx: 50, ry: 38 },
    ],
    beams: [],
    bloom: 2.2,
  },
};

function beamGeometry(lamp: Lamp, b: Beam) {
  const ax = (b.x / 100) * lamp.w;
  const ay = (b.y / 100) * lamp.h;
  const rad = (b.angle * Math.PI) / 180;
  const dir = { x: -Math.sin(rad), y: Math.cos(rad) };
  const perp = { x: dir.y, y: -dir.x };
  const floorY = lamp.h * 0.985;
  const length = b.floor && dir.y > 0 ? (floorY - ay) / dir.y : b.length;
  const far = b.half + length * Math.tan(((b.spread / 2) * Math.PI) / 180);
  const ex = ax + dir.x * length;
  const ey = ay + dir.y * length;
  const pts = [
    [ax + perp.x * b.half, ay + perp.y * b.half],
    [ex + perp.x * far, ey + perp.y * far],
    [ex - perp.x * far, ey - perp.y * far],
    [ax - perp.x * b.half, ay - perp.y * b.half],
  ];
  return { ax, ay, ex, ey, far, length, points: pts.map((p) => p.join(",")).join(" ") };
}

const KIND_WORDS: [LampKind, RegExp][] = [
  ["desk", /desk|reading|study|office/i],
  ["floor", /floor|living|lounge/i],
  ["pendant", /pendant|kitchen|dining|island/i],
  ["mushroom", /bedside|night|bedroom|nursery/i],
  ["sconce", /wall|sconce|hall|entry|stair/i],
  ["ceiling", /ceiling|main|overhead/i],
  ["bulb", /bulb|strip|party|rgb|color|colour/i],
];

export function lampKind(name: string): LampKind {
  return KIND_WORDS.find(([, re]) => re.test(name))?.[0] ?? "table";
}

export function LampArt(props: { kind: LampKind; on: boolean; brightness: number; color: string }) {
  const lamp = () => LAMPS[props.kind];
  const level = () => (props.on ? 0.3 + (props.brightness / 100) * 0.7 : 0);
  const main = () => lamp().emit[0];
  const id = createUniqueId();
  return (
    <div
      class="lamp-art"
      data-on={props.on || undefined}
      data-flip={lamp().flip || undefined}
      style={{
        "--lamp-color": props.color,
        "--lamp-level": level(),
        "--lamp-mask": `url("${lamp().src}")`,
      }}
    >
      <Show when={main()}>
        {(e) => (
          <div
            class="lamp-bloom"
            style={{
              left: `${e().x}%`,
              top: `${e().y}%`,
              width: `${e().rx * 2 * lamp().bloom * 2}%`,
              height: `${e().ry * 2 * lamp().bloom * 2}%`,
            }}
          />
        )}
      </Show>
      <svg
        class="lamp-light"
        viewBox={`0 0 ${lamp().w} ${lamp().h}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter id={`${id}-soft`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={lamp().h * 0.022} />
          </filter>
          <radialGradient id={`${id}-pool`}>
            <stop offset="0%" stop-color="var(--lamp-color)" stop-opacity="0.55" />
            <stop offset="45%" stop-color="var(--lamp-color)" stop-opacity="0.18" />
            <stop offset="100%" stop-color="var(--lamp-color)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <For each={lamp().beams.map((b) => beamGeometry(lamp(), b))}>
          {(g, i) => (
            <>
              <radialGradient
                id={`${id}-beam-${i()}`}
                gradientUnits="userSpaceOnUse"
                cx={g.ax}
                cy={g.ay}
                r={g.length * 1.05}
              >
                <stop offset="0%" stop-color="var(--lamp-color)" stop-opacity="0.6" />
                <stop offset="30%" stop-color="var(--lamp-color)" stop-opacity="0.26" />
                <stop offset="70%" stop-color="var(--lamp-color)" stop-opacity="0.08" />
                <stop offset="100%" stop-color="var(--lamp-color)" stop-opacity="0" />
              </radialGradient>
              <polygon points={g.points} fill={`url(#${id}-beam-${i()})`} filter={`url(#${id}-soft)`} />
            </>
          )}
        </For>
        <For each={lamp().beams.filter((b) => b.floor).map((b) => beamGeometry(lamp(), b))}>
          {(g) => (
            <ellipse
              cx={g.ex}
              cy={g.ey}
              rx={g.far * 1.25}
              ry={g.far * 0.24}
              fill={`url(#${id}-pool)`}
            />
          )}
        </For>
        <Show when={lamp().pool}>
          {(p) => (
            <ellipse
              cx={(p().x / 100) * lamp().w}
              cy={(p().y / 100) * lamp().h}
              rx={(p().rx / 100) * lamp().w * 0.5}
              ry={(p().rx / 100) * lamp().w * 0.12}
              fill={`url(#${id}-pool)`}
            />
          )}
        </Show>
      </svg>
      <img src={lamp().src} alt="" draggable={false} />
      <div
        class="lamp-emit"
        style={{
          background: lamp()
            .emit.map(
              (e) =>
                e.core
                  ? `radial-gradient(${e.rx}% ${e.ry}% at ${e.x}% ${e.y}%, color-mix(in oklch, var(--lamp-color) 20%, white) 0%, color-mix(in oklch, var(--lamp-color) 70%, white) 35%, var(--lamp-color) 70%, transparent 100%)`
                  : `radial-gradient(${e.rx}% ${e.ry}% at ${e.x}% ${e.y}%, color-mix(in oklch, var(--lamp-color) 70%, white) 0%, var(--lamp-color) 60%, transparent 100%)`,
            )
            .join(", "),
        }}
      />
      <div class="lamp-cast" />
    </div>
  );
}
