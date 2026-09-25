import { For, Show } from "solid-js";
import curtainArt from "./assets/cover-curtain.art";
import garageArt from "./assets/cover-garage.art";
import shutterArt from "./assets/cover-shutter.art";
import windowArt from "./assets/cover-window.art";
import "./cover.css";

type Point = readonly [number, number];
type Quad = { tl: Point; tr: Point; br: Point; bl: Point };

export type CoverKind = "blind" | "curtain" | "shutter" | "garage";

/** Maps the unit square onto the quad the Blender script projected, in percent of the image. */
function projector(quad: Quad) {
  const [x0, y0] = quad.tl;
  const [x1, y1] = quad.tr;
  const [x2, y2] = quad.br;
  const [x3, y3] = quad.bl;
  const dx1 = x1 - x2;
  const dx2 = x3 - x2;
  const dy1 = y1 - y2;
  const dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3;
  const sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  const a = x1 - x0 + g * x1;
  const b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1;
  const e = y3 - y0 + h * y3;
  return (u: number, v: number): Point => {
    const w = g * u + h * v + 1;
    return [((a * u + b * v + x0) / w) * 100, ((d * u + e * v + y0) / w) * 100];
  };
}

const polygon = (points: Point[]) =>
  `polygon(${points.map(([x, y]) => `${x.toFixed(2)}% ${y.toFixed(2)}%`).join(", ")})`;

type Still = { src: string; aspect: number; quad: Quad };

/** A panel drawn down from the quad's top edge; `seams` run across it, as shares of its height. */
type Roller = {
  art: Still;
  at: (u: number, v: number) => Point;
  seams: number[];
  rail: number;
  headrail: boolean;
};

const seams = (count: number) => Array.from({ length: count - 1 }, (_, i) => (i + 1) / count);
const roller = (art: Still, lines: number[], rail: number, headrail = false): Roller => ({
  art,
  at: projector(art.quad),
  seams: lines,
  rail,
  headrail,
});

const ROLLERS: Record<Exclude<CoverKind, "curtain">, Roller> = {
  blind: roller(windowArt, seams(22), 0.025, true),
  shutter: roller(shutterArt, seams(16), 0.03),
  garage: roller(garageArt, seams(4), 0.02),
};

const curtainAt = projector(curtainArt.quad);
const FOLDS = Array.from({ length: 8 }, (_, i) => i);
const SIDES = ["left", "right"] as const;
const CLOSED_PANEL = 0.52;
const GATHERED_PANEL = 0.13;

export function CoverArt(props: { kind: CoverKind; closed: number }) {
  const share = () => Math.min(100, Math.max(0, props.closed)) / 100;
  const rollerFor = () => {
    const kind = props.kind;
    return kind === "curtain" ? undefined : ROLLERS[kind];
  };
  const art = () => rollerFor()?.art ?? curtainArt;
  return (
    <div
      class="cover-art"
      data-kind={props.kind}
      style={{ "aspect-ratio": String(art().aspect), "--art-aspect": art().aspect }}
    >
      <img src={art().src} alt="" />
      <Show when={rollerFor()} keyed fallback={<Curtain open={1 - share()} />}>
        {(roller) => <RollerPanel roller={roller} share={share()} />}
      </Show>
    </div>
  );
}

function RollerPanel(props: { roller: Roller; share: number }) {
  const at = (u: number, v: number) => props.roller.at(u, v);
  const edge = () => {
    const { rail, headrail } = props.roller;
    return headrail ? rail + props.share * (1 - rail) : props.share;
  };
  const panel = () => polygon([at(0, 0), at(1, 0), at(1, edge()), at(0, edge())]);
  const rail = () => {
    const top = Math.max(0, edge() - props.roller.rail);
    return polygon([at(0, top), at(1, top), at(1, edge()), at(0, edge())]);
  };
  return (
    <>
      <div class="cover-panel" style={{ "clip-path": panel() }}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <For each={props.roller.seams}>
            {(v) => {
              const [x1, y1] = at(0, v);
              const [x2, y2] = at(1, v);
              return (
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  class="cover-seam"
                  vector-effect="non-scaling-stroke"
                />
              );
            }}
          </For>
        </svg>
      </div>
      <div class="cover-rail" style={{ "clip-path": rail() }} />
    </>
  );
}

function Curtain(props: { open: number }) {
  const width = () => CLOSED_PANEL - (CLOSED_PANEL - GATHERED_PANEL) * props.open;
  const fold = (i: number, side: (typeof SIDES)[number]) => {
    const from = (width() * i) / FOLDS.length;
    const to = (width() * (i + 1)) / FOLDS.length;
    const [u0, u1] = side === "left" ? [from, to] : [1 - to, 1 - from];
    return polygon([curtainAt(u0, 0), curtainAt(u1, 0), curtainAt(u1, 1), curtainAt(u0, 1)]);
  };
  return (
    <For each={SIDES}>
      {(side) => (
        <For each={FOLDS}>
          {(i) => <div class="cover-fold" style={{ "clip-path": fold(i, side) }} />}
        </For>
      )}
    </For>
  );
}
