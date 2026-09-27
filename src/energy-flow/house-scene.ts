export type SceneRole = "roof" | "base" | "wall-right";

export interface SceneNode {
  id: string;
  role: SceneRole;
}

interface Point {
  x: number;
  y: number;
}

export type LabelSide = "left" | "right" | "bottom";

interface SceneLabel {
  id: string;
  side: LabelSide;
  /** Where the label meets its line: inner edge for columns, top centre for the bottom row. */
  at: Point;
}

export interface SceneLink {
  id: string;
  side: LabelSide;
  from: Point;
  anchor: Point;
}

export interface HouseScene {
  house: { x: number; y: number; w: number; h: number };
  labels: SceneLabel[];
  links: SceneLink[];
}

/** Width over height of the house art. */
const HOUSE_ASPECT = 520 / 358;
const LABEL_W = 96;
const BOTTOM_H = 36;
const GAP = 16;
const ROW_MIN = 40;

// Points on the house art, as shares of its box; each role spreads along its line when shared.
const ANCHORS: Record<SceneRole, (i: number, n: number) => Point> = {
  roof: (i, n) => ({ x: 0.1 + (0.3 * (i + 1)) / (n + 1), y: 0.27 - (0.12 * (i + 1)) / (n + 1) }),
  base: (i, n) => ({ x: 0.12 + (0.64 * (i + 1)) / (n + 1), y: 0.93 }),
  "wall-right": (i, n) => ({ x: 0.93, y: 0.45 + (0.35 * (i + 1)) / (n + 1) }),
};

const SIDE: Record<SceneRole, LabelSide> = { roof: "left", base: "bottom", "wall-right": "right" };

export function layoutHouseScene(
  nodes: SceneNode[],
  box: { width: number; height: number },
): HouseScene {
  const has = (side: LabelSide) => nodes.some((n) => SIDE[n.role] === side);
  const leftW = has("left") ? LABEL_W + GAP : 0;
  const rightW = has("right") ? LABEL_W + GAP : 0;
  const bottomH = has("bottom") ? BOTTOM_H + GAP : 0;
  const room = box.width - 2 * Math.max(leftW, rightW);
  const w = Math.max(0, Math.min(room, (box.height - bottomH) * HOUSE_ASPECT));
  const h = w / HOUSE_ASPECT;
  const house = { x: (box.width - w) / 2, y: (box.height - bottomH - h) / 2, w, h };

  const counts = new Map<SceneRole, number>();
  for (const n of nodes) counts.set(n.role, (counts.get(n.role) ?? 0) + 1);
  const seen = new Map<SceneRole, number>();
  const column = (side: LabelSide) => nodes.filter((n) => SIDE[n.role] === side);
  const rowY = (side: LabelSide, id: string) => {
    const list = column(side);
    const i = list.findIndex((n) => n.id === id);
    const span = Math.max(house.h, (list.length + 1) * ROW_MIN);
    const top = Math.max(0, house.y + house.h / 2 - span / 2);
    return top + (span * (i + 1)) / (list.length + 1);
  };

  const rowX = (id: string) => {
    const list = column("bottom");
    const i = list.findIndex((n) => n.id === id);
    return (box.width * (i + 1)) / (list.length + 1);
  };

  const labels: SceneLabel[] = [];
  const links: SceneLink[] = [];
  for (const n of nodes) {
    const i = seen.get(n.role) ?? 0;
    seen.set(n.role, i + 1);
    const share = ANCHORS[n.role](i, counts.get(n.role) ?? 1);
    const anchor = { x: house.x + share.x * house.w, y: house.y + share.y * house.h };
    const side = SIDE[n.role];
    const at =
      side === "bottom"
        ? { x: rowX(n.id), y: box.height - BOTTOM_H }
        : { x: side === "left" ? house.x - GAP : house.x + house.w + GAP, y: rowY(side, n.id) };
    labels.push({ id: n.id, side, at });
    links.push({ id: n.id, side, from: at, anchor });
  }
  return { house, labels, links };
}

/** A soft S-curve: horizontal out of a column label, vertical up out of a bottom label. */
export function linkPath(link: Pick<SceneLink, "side" | "from" | "anchor">): string {
  const { from, anchor: to } = link;
  if (link.side === "bottom") {
    const mid = (from.y + to.y) / 2;
    return `M${from.x},${from.y} C${from.x},${mid} ${to.x},${mid} ${to.x},${to.y}`;
  }
  const mid = (from.x + to.x) / 2;
  return `M${from.x},${from.y} C${mid},${from.y} ${mid},${to.y} ${to.x},${to.y}`;
}

function cubicPoint(p0: Point, p1: Point, p2: Point, p3: Point, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * p1.x + c * p2.x + d * p3.x,
    y: a * p0.y + b * p1.y + c * p2.y + d * p3.y,
  };
}

function controlPoints(
  link: Pick<SceneLink, "side" | "from" | "anchor">,
): [Point, Point, Point, Point] {
  const { from, anchor: to } = link;
  if (link.side === "bottom") {
    const mid = (from.y + to.y) / 2;
    return [from, { x: from.x, y: mid }, { x: to.x, y: mid }, to];
  }
  const mid = (from.x + to.x) / 2;
  return [from, { x: mid, y: from.y }, { x: mid, y: to.y }, to];
}

/** The link as a filled ribbon, `fromW` wide at the label and `toW` wide at the house. */
export function ribbonShape(
  link: Pick<SceneLink, "side" | "from" | "anchor">,
  fromW: number,
  toW: number,
): string {
  const [p0, p1, p2, p3] = controlPoints(link);
  const steps = 24;
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = cubicPoint(p0, p1, p2, p3, t);
    const q = cubicPoint(p0, p1, p2, p3, Math.min(1, t + 0.01));
    const r = cubicPoint(p0, p1, p2, p3, Math.max(0, t - 0.01));
    const dx = q.x - r.x;
    const dy = q.y - r.y;
    const len = Math.hypot(dx, dy) || 1;
    const half = (fromW + (toW - fromW) * t) / 2;
    left.push({ x: p.x - (dy / len) * half, y: p.y + (dx / len) * half });
    right.push({ x: p.x + (dy / len) * half, y: p.y - (dx / len) * half });
  }
  const f = (p: Point) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  return `M${left.map(f).join("L")}L${right.reverse().map(f).join("L")}Z`;
}

/** Ribbon width for a flow, relative to the largest one on screen; square root keeps small flows visible. */
export function flowWidth(watts: number, maxWatts: number): number {
  const share = Math.sqrt(Math.min(1, Math.max(0, watts) / (maxWatts || 1)));
  return 2.5 + share * 9.5;
}
