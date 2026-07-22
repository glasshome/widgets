import { useWidgetContext } from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";
import type { AnalogOptions, AnalogPresetTheme, ClockPreset, ClockSize } from "./types";

/** Hours (0-11), minutes, seconds for the given instant + optional zone. */
function readAnalogTime(date: Date, timeZone?: string) {
  if (!timeZone) {
    return { hours: date.getHours() % 12, minutes: date.getMinutes(), seconds: date.getSeconds() };
  }
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  }).formatToParts(date);
  const get = (t: string) => Number.parseInt(parts.find((p) => p.type === t)?.value || "0", 10);
  return { hours: get("hour") % 12, minutes: get("minute"), seconds: get("second") };
}

function readoutLabel(t: { hours: number; minutes: number }): string {
  return `Analog clock showing ${((t.hours + 11) % 12) + 1}:${String(t.minutes).padStart(2, "0")}`;
}

/** Per-preset character shared by the round + square faces: ticks, hands, numerals, font. */
interface FaceStyle {
  minuteTicks: boolean;
  doubleQuarter: boolean; // twin bars at 12/3/6/9
  hourLen: number;
  hourWidth: number;
  minuteLen: number;
  minuteWidth: number;
  numerals: "none" | "quarter" | "all";
  numeralFont: string;
  numeralWeight: string;
  hand: "taper" | "line" | "bar";
}

const FACE_STYLES: Record<ClockPreset, FaceStyle> = {
  // Baker+Brown look: thin minute ticks, bold hour bars, twin bars at quarters.
  minimal: {
    minuteTicks: true,
    doubleQuarter: true,
    hourLen: 18,
    hourWidth: 3,
    minuteLen: 7,
    minuteWidth: 1,
    numerals: "none",
    numeralFont: "ui-monospace, SFMono-Regular, monospace",
    numeralWeight: "500",
    hand: "taper",
  },
  modern: {
    minuteTicks: false,
    doubleQuarter: false,
    hourLen: 14,
    hourWidth: 3,
    minuteLen: 6,
    minuteWidth: 1.5,
    numerals: "quarter",
    numeralFont: "ui-sans-serif, system-ui, sans-serif",
    numeralWeight: "600",
    hand: "taper",
  },
  classic: {
    minuteTicks: true,
    doubleQuarter: false,
    hourLen: 12,
    hourWidth: 2,
    minuteLen: 5,
    minuteWidth: 1,
    numerals: "all",
    numeralFont: "Georgia, Cambria, serif",
    numeralWeight: "400",
    hand: "line",
  },
  bold: {
    minuteTicks: false,
    doubleQuarter: false,
    hourLen: 24,
    hourWidth: 6,
    minuteLen: 0,
    minuteWidth: 0,
    numerals: "none",
    numeralFont: "ui-sans-serif, system-ui, sans-serif",
    numeralWeight: "900",
    hand: "bar",
  },
};

interface AnalogClockProps {
  date: Date;
  timeZone?: string;
  size: ClockSize;
  showSeconds: boolean;
  preset: ClockPreset;
  analogOptions?: AnalogOptions;
  presetTheme?: AnalogPresetTheme;
}

const SIZE_MAP: Record<ClockSize, number> = {
  small: 130,
  medium: 170,
  large: 210,
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

// Colours come from the theme (adapt to light/dark); the preset drives shape/character only.
// Shared verbatim with the square face so all three clock styles read as one system.
const FACE_THEME = {
  tickColor: "var(--color-foreground)",
  handColor: "var(--color-foreground)",
  accentColor: "var(--tone-accent)",
  faceColor: "var(--tone-neutral)",
} as const;

/**
 * Round analog face. A circular sibling of the square face: same theme-aware
 * palette, same per-preset character (shaped/gradient/glowing hands, numerals,
 * ornaments, jeweled cap) — only the geometry is a circle instead of the box.
 */
export function AnalogClock(props: AnalogClockProps) {
  const theme = FACE_THEME;
  const style = () => FACE_STYLES[props.preset] ?? FACE_STYLES.minimal;
  const options = () => props.analogOptions ?? { border: false, ticks: "hour" as const };
  const border = () => options().border;
  const ticks = () => options().ticks;

  const size = () => SIZE_MAP[props.size] ?? 130;
  const cx = () => size() / 2;
  const cy = () => size() / 2;
  const radius = () => size() / 2 - 14;
  const k = () => radius() / 88; // scale the square face's px metrics onto the round face

  const time = createMemo(() => readAnalogTime(props.date, props.timeZone));
  // Skip the transition on the 59→0 wrap so the second hand / ring don't unwind.
  const wrap = () => time().seconds === 0;

  const hourAngle = () => (time().hours * 30 + time().minutes * 0.5) % 360;
  const minuteAngle = () => time().minutes * 6 + time().seconds * 0.1;
  const secondAngle = () => time().seconds * 6;

  // Point on the face at `angleDeg` (0 = up, clockwise), `r` out from centre.
  const polar = (angleDeg: number, r: number) => {
    const a = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    return { x: cx() + dx * r, y: cy() + dy * r, dx, dy };
  };

  // Slanted (radial) ticks pointing inward, mirroring the square face's marks.
  const tickElements = createMemo(() => {
    if (ticks() === "none") return [];
    const s = style();
    const out: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [];

    if (s.minuteTicks) {
      const len = s.minuteLen * k();
      const width = Math.max(0.75, s.minuteWidth * k());
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const p = polar(i * 6, radius());
        out.push({ x1: p.x, y1: p.y, x2: p.x - p.dx * len, y2: p.y - p.dy * len, width });
      }
    }

    const len = s.hourLen * k();
    const width = Math.max(1, s.hourWidth * k());
    for (let h = 0; h < 12; h++) {
      const p = polar(h * 30, radius());
      const isQuarter = h % 3 === 0;
      if (s.doubleQuarter && isQuarter) {
        const px = -p.dy;
        const py = p.dx;
        const gap = (s.hourWidth + 2) * k();
        for (const off of [-gap / 2, gap / 2]) {
          const ox = px * off;
          const oy = py * off;
          out.push({
            x1: p.x + ox,
            y1: p.y + oy,
            x2: p.x + ox - p.dx * len,
            y2: p.y + oy - p.dy * len,
            width,
          });
        }
      } else {
        out.push({ x1: p.x, y1: p.y, x2: p.x - p.dx * len, y2: p.y - p.dy * len, width });
      }
    }
    return out;
  });

  const numeralElements = createMemo(() => {
    const mode = style().numerals;
    if (mode === "none") return [];
    const fs = Math.max(9, radius() * 0.15);
    const hours = mode === "quarter" ? [12, 3, 6, 9] : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const roman = props.preset === "classic";
    const off = style().hourLen * k() + fs * 0.85;
    return hours.map((h) => {
      const p = polar((h % 12) * 30, radius() - off);
      return { label: roman ? ROMAN[h] : `${h}`, x: p.x, y: p.y, size: fs };
    });
  });

  const ringC = () => 2 * Math.PI * radius();
  const ringOffset = () => ringC() * (1 - time().seconds / 60);

  // Bold: radar wedge swept from 12 to the minute hand.
  const wedgePath = createMemo(() => {
    const r = radius() * 0.92;
    const a = (minuteAngle() * Math.PI) / 180;
    const ex = cx() + r * Math.sin(a);
    const ey = cy() - r * Math.cos(a);
    const large = minuteAngle() % 360 > 180 ? 1 : 0;
    return `M ${cx()} ${cy()} L ${cx()} ${cy() - r} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
  });

  const gid = () => `round-${props.preset}`;
  const handLen = () => radius();

  const handStyle = (angle: number, animate: boolean) => ({
    "transform-origin": `${cx()}px ${cy()}px`,
    transform: `rotate(${angle}deg)`,
    transition: animate
      ? wrap()
        ? "none"
        : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)"
      : "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
  });

  // One hand, shaped by the preset and optionally ornamented / glowing.
  const Hand = (p: {
    angle: number;
    lenFrac: number;
    tailFrac: number;
    color: string;
    width: number;
    animate?: boolean;
    forceLine?: boolean;
    gradient?: boolean;
    glow?: boolean;
    ornate?: boolean;
  }) => {
    const tipY = () => cy() - handLen() * p.lenFrac;
    const baseY = () => cy() + handLen() * p.tailFrac;
    const shape = () => (p.forceLine ? "line" : style().hand);
    const paint = () => (p.gradient ? `url(#${gid()}-hand)` : p.color);
    return (
      <g
        style={handStyle(p.angle, p.animate ?? false)}
        filter={p.glow ? `url(#${gid()}-glow)` : undefined}
      >
        <Show
          when={shape() === "taper"}
          fallback={
            <line
              x1={cx()}
              y1={baseY()}
              x2={cx()}
              y2={tipY()}
              stroke={paint()}
              stroke-width={p.width}
              stroke-linecap="round"
            />
          }
        >
          <polygon
            points={`${cx() - p.width / 2},${baseY()} ${cx() - p.width * 0.22},${tipY()} ${cx() + p.width * 0.22},${tipY()} ${cx() + p.width / 2},${baseY()}`}
            fill={paint()}
          />
        </Show>
        <Show when={p.ornate}>
          <polygon
            points={`${cx()},${tipY() + handLen() * 0.16} ${cx() + p.width * 1.6},${tipY() + handLen() * 0.08} ${cx()},${tipY()} ${cx() - p.width * 1.6},${tipY() + handLen() * 0.08}`}
            fill={paint()}
          />
          <circle
            cx={cx()}
            cy={baseY()}
            r={p.width * 1.3}
            fill="none"
            stroke={paint()}
            stroke-width={1.5}
          />
        </Show>
      </g>
    );
  };

  const hourW = () =>
    (style().hand === "bar" ? 10 : style().hand === "line" ? 3.5 : 8) * Math.max(0.7, k());
  const minuteW = () =>
    (style().hand === "bar" ? 7 : style().hand === "line" ? 2.5 : 6) * Math.max(0.7, k());
  const ornate = () => props.preset === "classic";
  const glowHands = () => props.preset === "modern";
  const gradHands = () => props.preset !== "classic";

  return (
    <svg
      width={size()}
      height={size()}
      viewBox={`0 0 ${size()} ${size()}`}
      class="overflow-visible"
      role="img"
      aria-label={readoutLabel(time())}
    >
      <defs>
        <linearGradient id={`${gid()}-hand`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stop-color={theme.handColor} stop-opacity="0.75" />
          <stop offset="100%" stop-color={theme.handColor} />
        </linearGradient>
        <filter id={`${gid()}-glow`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Face */}
      <circle cx={cx()} cy={cy()} r={radius()} fill={theme.faceColor} />

      {/* ── BOLD: ghost hour numeral + radar wedge ── */}
      <Show when={props.preset === "bold"}>
        <text
          x={cx()}
          y={cy()}
          fill={theme.accentColor}
          opacity={0.08}
          font-size={`${radius() * 1.1}`}
          font-family="ui-sans-serif, system-ui, sans-serif"
          font-weight="900"
          text-anchor="middle"
          dominant-baseline="central"
        >
          {((time().hours + 11) % 12) + 1}
        </text>
        <path d={wedgePath()} fill={theme.accentColor} opacity={0.14} />
      </Show>

      {/* ── MODERN: inner HUD ring + centre reticle ── */}
      <Show when={props.preset === "modern"}>
        <circle
          cx={cx()}
          cy={cy()}
          r={radius() - 8}
          fill="none"
          stroke={theme.accentColor}
          stroke-width={1}
          stroke-dasharray="2 5"
          opacity={0.35}
        />
        <circle
          cx={cx()}
          cy={cy()}
          r={11}
          fill="none"
          stroke={theme.accentColor}
          stroke-width={1}
          opacity={0.5}
        />
      </Show>

      {/* ── CLASSIC: double ring frame ── */}
      <Show when={props.preset === "classic"}>
        <circle
          cx={cx()}
          cy={cy()}
          r={radius()}
          fill="none"
          stroke={theme.tickColor}
          stroke-width={2}
          opacity={0.35}
        />
        <circle
          cx={cx()}
          cy={cy()}
          r={radius() - 6}
          fill="none"
          stroke={theme.tickColor}
          stroke-width={1}
          opacity={0.25}
        />
      </Show>

      {/* User-toggled outline (kept for non-classic) */}
      <Show when={border() && props.preset !== "classic"}>
        <circle
          cx={cx()}
          cy={cy()}
          r={radius()}
          fill="none"
          stroke={theme.tickColor}
          stroke-width={2}
          opacity={0.4}
        />
      </Show>

      {/* Seconds progress ring */}
      <Show when={props.showSeconds}>
        <circle
          cx={cx()}
          cy={cy()}
          r={radius()}
          fill="none"
          stroke={theme.accentColor}
          stroke-width={2.5}
          stroke-linecap="round"
          stroke-dasharray={`${ringC()}`}
          stroke-dashoffset={`${ringOffset()}`}
          transform={`rotate(-90 ${cx()} ${cy()})`}
          style={{
            transition: wrap() ? "none" : "stroke-dashoffset 950ms linear",
            filter: `drop-shadow(0 0 4px ${theme.accentColor})`,
          }}
        />
      </Show>

      <For each={tickElements()}>
        {(tick) => (
          <line
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={theme.tickColor}
            stroke-width={tick.width}
            stroke-linecap="round"
          />
        )}
      </For>

      {/* Numerals */}
      <For each={numeralElements()}>
        {(n) => (
          <text
            x={n.x}
            y={n.y}
            fill={theme.tickColor}
            font-size={`${n.size}`}
            font-family={style().numeralFont}
            font-weight={style().numeralWeight}
            text-anchor="middle"
            dominant-baseline="central"
          >
            {n.label}
          </text>
        )}
      </For>

      {/* Hour + minute hands */}
      <Hand
        angle={hourAngle()}
        lenFrac={0.5}
        tailFrac={0.12}
        color={theme.handColor}
        width={hourW()}
        gradient={gradHands()}
        glow={glowHands()}
        ornate={ornate()}
      />
      <Hand
        angle={minuteAngle()}
        lenFrac={0.78}
        tailFrac={0.16}
        color={theme.handColor}
        width={minuteW()}
        gradient={gradHands()}
        glow={glowHands()}
        ornate={ornate()}
      />

      {/* Second hand (thin line, glowing accent) */}
      <Show when={props.showSeconds}>
        <Hand
          angle={secondAngle()}
          lenFrac={0.9}
          tailFrac={0.22}
          color={theme.accentColor}
          width={1.5}
          animate
          forceLine
          glow
        />
      </Show>

      {/* Center cap — layered for a jeweled look */}
      <circle cx={cx()} cy={cy()} r={7} fill={theme.faceColor} />
      <circle cx={cx()} cy={cy()} r={5} fill={theme.handColor} />
      <Show when={props.preset === "classic"}>
        <circle
          cx={cx()}
          cy={cy()}
          r={9}
          fill="none"
          stroke={theme.handColor}
          stroke-width={1}
          opacity={0.6}
        />
      </Show>
      <circle cx={cx()} cy={cy()} r={1.6} fill={theme.accentColor} />
    </svg>
  );
}

interface SquareAnalogClockProps {
  date: Date;
  timeZone?: string;
  showSeconds: boolean;
  preset: ClockPreset;
  analogOptions?: AnalogOptions;
  presetTheme?: AnalogPresetTheme;
}

/**
 * Analog clock whose face is the widget itself: ticks land on the rectangular
 * edges (ray from centre → border), seconds trace the perimeter from 12.
 * Reads the live measured box, so it must render inside <Widget>.
 */
export function SquareAnalogClock(props: SquareAnalogClockProps) {
  const ctx = useWidgetContext();
  // Colors come from the theme (adapt to light/dark); the preset drives shape only.
  const theme = () => ({
    tickColor: "var(--color-foreground)",
    handColor: "var(--color-foreground)",
    accentColor: "var(--tone-accent)",
    faceColor: "var(--tone-neutral)",
  });
  const ticks = () => props.analogOptions?.ticks ?? "hour";
  const border = () => props.analogOptions?.border ?? false;

  const time = createMemo(() => readAnalogTime(props.date, props.timeZone));
  const wrap = () => time().seconds === 0;

  const dims = createMemo(() => {
    const d = ctx.dimensions();
    // Ticks sit flush on the widget edge; tiny inset only clears the shell border.
    const pad = 3;
    const w = Math.max(d.width, 1);
    const h = Math.max(d.height, 1);
    return { w, h, pad, cx: w / 2, cy: h / 2, hw: w / 2 - pad, hh: h / 2 - pad };
  });

  const style = () => FACE_STYLES[props.preset] ?? FACE_STYLES.minimal;

  // Where a ray from the centre at `angleDeg` (0 = up, clockwise) meets the box.
  const edgePoint = (angleDeg: number) => {
    const { cx, cy, hw, hh } = dims();
    const a = (angleDeg * Math.PI) / 180;
    const dx = Math.sin(a);
    const dy = -Math.cos(a);
    const tx = dx !== 0 ? hw / Math.abs(dx) : Number.POSITIVE_INFINITY;
    const ty = dy !== 0 ? hh / Math.abs(dy) : Number.POSITIVE_INFINITY;
    const t = Math.min(tx, ty);
    return { x: cx + dx * t, y: cy + dy * t, dx, dy };
  };

  // Slanted (radial) ticks: each mark points inward toward the centre.
  const tickElements = createMemo(() => {
    if (ticks() === "none") return [];
    const s = style();
    const out: { x1: number; y1: number; x2: number; y2: number; width: number }[] = [];

    if (s.minuteTicks) {
      for (let i = 0; i < 60; i++) {
        if (i % 5 === 0) continue;
        const p = edgePoint(i * 6);
        out.push({
          x1: p.x,
          y1: p.y,
          x2: p.x - p.dx * s.minuteLen,
          y2: p.y - p.dy * s.minuteLen,
          width: s.minuteWidth,
        });
      }
    }

    for (let h = 0; h < 12; h++) {
      const p = edgePoint(h * 30);
      const isQuarter = h % 3 === 0;
      if (s.doubleQuarter && isQuarter) {
        const px = -p.dy;
        const py = p.dx;
        const gap = s.hourWidth + 2;
        for (const off of [-gap / 2, gap / 2]) {
          const ox = px * off;
          const oy = py * off;
          out.push({
            x1: p.x + ox,
            y1: p.y + oy,
            x2: p.x + ox - p.dx * s.hourLen,
            y2: p.y + oy - p.dy * s.hourLen,
            width: s.hourWidth,
          });
        }
      } else {
        out.push({
          x1: p.x,
          y1: p.y,
          x2: p.x - p.dx * s.hourLen,
          y2: p.y - p.dy * s.hourLen,
          width: s.hourWidth,
        });
      }
    }
    return out;
  });

  const numeralElements = createMemo(() => {
    const mode = style().numerals;
    if (mode === "none") return [];
    const size = Math.max(11, Math.min(dims().hw, dims().hh) * 0.14);
    const hours = mode === "quarter" ? [12, 3, 6, 9] : [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const roman = props.preset === "classic";
    return hours.map((h) => {
      const p = edgePoint((h % 12) * 30);
      const off = style().hourLen + size * 0.9;
      const label = roman ? ROMAN[h] : `${h}`;
      return { label, x: p.x - p.dx * off, y: p.y - p.dy * off, size };
    });
  });

  // Perimeter path from top-centre, clockwise. pathLength=60 → dash math in seconds.
  const perimeter = createMemo(() => {
    const { w, h, cx } = dims();
    // Inset + round the trace so it stays inside the shell's clipped rounded corner
    // (larger than the tick pad). Too-tight a corner here chamfers under overflow-hidden.
    const inset = 6;
    const r = 16;
    const x0 = inset;
    const y0 = inset;
    const x1 = w - inset;
    const y1 = h - inset;
    return `M ${cx} ${y0}
      L ${x1 - r} ${y0} Q ${x1} ${y0} ${x1} ${y0 + r}
      L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1}
      L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r}
      L ${x0} ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0}
      L ${cx} ${y0}`;
  });

  const handLen = () => Math.min(dims().hw, dims().hh);
  const hourAngle = () => (time().hours * 30 + time().minutes * 0.5) % 360;
  const minuteAngle = () => time().minutes * 6 + time().seconds * 0.1;
  const secondAngle = () => time().seconds * 6;

  const gid = () => `sq-${props.preset}`;

  const roundedRect = (inset: number, r: number) => {
    const { w, h } = dims();
    const x0 = inset;
    const y0 = inset;
    const x1 = w - inset;
    const y1 = h - inset;
    return `M ${x0 + r} ${y0} L ${x1 - r} ${y0} Q ${x1} ${y0} ${x1} ${y0 + r}
      L ${x1} ${y1 - r} Q ${x1} ${y1} ${x1 - r} ${y1}
      L ${x0 + r} ${y1} Q ${x0} ${y1} ${x0} ${y1 - r}
      L ${x0} ${y0 + r} Q ${x0} ${y0} ${x0 + r} ${y0} Z`;
  };

  // Bold: radar wedge swept from 12 to the minute hand.
  const wedgePath = createMemo(() => {
    const { cx, cy } = dims();
    const r = handLen() * 0.92;
    const a = (minuteAngle() * Math.PI) / 180;
    const ex = cx + r * Math.sin(a);
    const ey = cy - r * Math.cos(a);
    const large = minuteAngle() % 360 > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${cx} ${cy - r} A ${r} ${r} 0 ${large} 1 ${ex} ${ey} Z`;
  });

  // Modern: viewfinder L-brackets at each corner.
  const cornerBrackets = createMemo(() => {
    const { w, h } = dims();
    const m = 12;
    const L = Math.max(14, Math.min(w, h) * 0.1);
    return [
      `M ${m} ${m + L} L ${m} ${m} L ${m + L} ${m}`,
      `M ${w - m - L} ${m} L ${w - m} ${m} L ${w - m} ${m + L}`,
      `M ${w - m} ${h - m - L} L ${w - m} ${h - m} L ${w - m - L} ${h - m}`,
      `M ${m + L} ${h - m} L ${m} ${h - m} L ${m} ${h - m - L}`,
    ];
  });

  const handStyle = (angle: number, animate: boolean) => {
    const { cx, cy } = dims();
    return {
      "transform-origin": `${cx}px ${cy}px`,
      transform: `rotate(${angle}deg)`,
      transition: animate
        ? wrap()
          ? "none"
          : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)"
        : "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
    };
  };

  // One hand, shaped by the preset and optionally ornamented / glowing.
  const Hand = (p: {
    angle: number;
    lenFrac: number;
    tailFrac: number;
    color: string;
    width: number;
    animate?: boolean;
    forceLine?: boolean;
    gradient?: boolean;
    glow?: boolean;
    ornate?: boolean;
  }) => {
    // Reactive: destructuring dims() to numbers here froze the drawn coords at
    // creation-time size, so hands drifted off-centre on resize until reload.
    const cx = () => dims().cx;
    const cy = () => dims().cy;
    const tipY = () => cy() - handLen() * p.lenFrac;
    const baseY = () => cy() + handLen() * p.tailFrac;
    const shape = () => (p.forceLine ? "line" : style().hand);
    const paint = () => (p.gradient ? `url(#${gid()}-hand)` : p.color);
    return (
      <g
        style={handStyle(p.angle, p.animate ?? false)}
        filter={p.glow ? `url(#${gid()}-glow)` : undefined}
      >
        <Show
          when={shape() === "taper"}
          fallback={
            <line
              x1={cx()}
              y1={baseY()}
              x2={cx()}
              y2={tipY()}
              stroke={paint()}
              stroke-width={p.width}
              stroke-linecap="round"
            />
          }
        >
          <polygon
            points={`${cx() - p.width / 2},${baseY()} ${cx() - p.width * 0.22},${tipY()} ${cx() + p.width * 0.22},${tipY()} ${cx() + p.width / 2},${baseY()}`}
            fill={paint()}
          />
        </Show>
        <Show when={p.ornate}>
          <polygon
            points={`${cx()},${tipY() + handLen() * 0.16} ${cx() + p.width * 1.6},${tipY() + handLen() * 0.08} ${cx()},${tipY()} ${cx() - p.width * 1.6},${tipY() + handLen() * 0.08}`}
            fill={paint()}
          />
          <circle
            cx={cx()}
            cy={baseY()}
            r={p.width * 1.3}
            fill="none"
            stroke={paint()}
            stroke-width={1.5}
          />
        </Show>
      </g>
    );
  };

  const hourW = () => (style().hand === "bar" ? 10 : style().hand === "line" ? 3.5 : 9);
  const minuteW = () => (style().hand === "bar" ? 7 : style().hand === "line" ? 2.5 : 6.5);
  const ornate = () => props.preset === "classic";
  const glowHands = () => props.preset === "modern";
  const gradHands = () => props.preset !== "classic";

  return (
    <Show when={ctx.dimensions().width > 0}>
      <svg
        viewBox={`0 0 ${dims().w} ${dims().h}`}
        preserveAspectRatio="none"
        class="absolute inset-0 h-full w-full"
        role="img"
        aria-label={readoutLabel(time())}
      >
        <defs>
          <linearGradient id={`${gid()}-hand`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color={theme().handColor} stop-opacity="0.75" />
            <stop offset="100%" stop-color={theme().handColor} />
          </linearGradient>
          <filter id={`${gid()}-glow`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── BOLD: ghost hour numeral + radar wedge ── */}
        <Show when={props.preset === "bold"}>
          <text
            x={dims().cx}
            y={dims().cy}
            fill={theme().accentColor}
            opacity={0.08}
            font-size={`${Math.min(dims().w, dims().h) * 0.72}`}
            font-family="ui-sans-serif, system-ui, sans-serif"
            font-weight="900"
            text-anchor="middle"
            dominant-baseline="central"
          >
            {((time().hours + 11) % 12) + 1}
          </text>
          <path d={wedgePath()} fill={theme().accentColor} opacity={0.14} />
        </Show>

        {/* ── MODERN: HUD inner frame, corner brackets, centre reticle ── */}
        <Show when={props.preset === "modern"}>
          <path
            d={roundedRect(dims().pad + 10, 10)}
            fill="none"
            stroke={theme().accentColor}
            stroke-width={1}
            opacity={0.22}
          />
          <For each={cornerBrackets()}>
            {(d) => (
              <path
                d={d}
                fill="none"
                stroke={theme().accentColor}
                stroke-width={1.5}
                stroke-linecap="round"
                opacity={0.55}
              />
            )}
          </For>
          <circle
            cx={dims().cx}
            cy={dims().cy}
            r={11}
            fill="none"
            stroke={theme().accentColor}
            stroke-width={1}
            opacity={0.5}
          />
        </Show>

        {/* ── CLASSIC: double frame ── */}
        <Show when={props.preset === "classic"}>
          <path
            d={roundedRect(dims().pad, 14)}
            fill="none"
            stroke={theme().tickColor}
            stroke-width={2}
            opacity={0.35}
          />
          <path
            d={roundedRect(dims().pad + 6, 11)}
            fill="none"
            stroke={theme().tickColor}
            stroke-width={1}
            opacity={0.25}
          />
        </Show>

        {/* User-toggled outline (kept for non-classic) */}
        <Show when={border() && props.preset !== "classic"}>
          <path
            d={perimeter()}
            fill="none"
            stroke={theme().tickColor}
            stroke-width={2}
            opacity={0.4}
          />
        </Show>

        {/* Seconds perimeter trace */}
        <Show when={props.showSeconds}>
          <path
            d={perimeter()}
            fill="none"
            stroke={theme().accentColor}
            stroke-width={2.5}
            stroke-linecap="round"
            pathLength={60}
            stroke-dasharray="60"
            stroke-dashoffset={`${60 - time().seconds}`}
            style={{
              transition: wrap() ? "none" : "stroke-dashoffset 950ms linear",
              filter: `drop-shadow(0 0 4px ${theme().accentColor})`,
            }}
          />
        </Show>

        <For each={tickElements()}>
          {(tick) => (
            <line
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
              stroke={theme().tickColor}
              stroke-width={tick.width}
              stroke-linecap="round"
            />
          )}
        </For>

        {/* Numerals */}
        <For each={numeralElements()}>
          {(n) => (
            <text
              x={n.x}
              y={n.y}
              fill={theme().tickColor}
              font-size={`${n.size}`}
              font-family={style().numeralFont}
              font-weight={style().numeralWeight}
              text-anchor="middle"
              dominant-baseline="central"
            >
              {n.label}
            </text>
          )}
        </For>

        {/* Hour + minute hands */}
        <Hand
          angle={hourAngle()}
          lenFrac={0.5}
          tailFrac={0.12}
          color={theme().handColor}
          width={hourW()}
          gradient={gradHands()}
          glow={glowHands()}
          ornate={ornate()}
        />
        <Hand
          angle={minuteAngle()}
          lenFrac={0.78}
          tailFrac={0.16}
          color={theme().handColor}
          width={minuteW()}
          gradient={gradHands()}
          glow={glowHands()}
          ornate={ornate()}
        />

        {/* Second hand (thin line, glowing accent) */}
        <Show when={props.showSeconds}>
          <Hand
            angle={secondAngle()}
            lenFrac={0.9}
            tailFrac={0.22}
            color={theme().accentColor}
            width={1.5}
            animate
            forceLine
            glow
          />
        </Show>

        {/* Center cap — layered for a jeweled look */}
        <circle cx={dims().cx} cy={dims().cy} r={7} fill={theme().faceColor} />
        <circle cx={dims().cx} cy={dims().cy} r={5} fill={theme().handColor} />
        <Show when={props.preset === "classic"}>
          <circle
            cx={dims().cx}
            cy={dims().cy}
            r={9}
            fill="none"
            stroke={theme().handColor}
            stroke-width={1}
            opacity={0.6}
          />
        </Show>
        <circle cx={dims().cx} cy={dims().cy} r={1.6} fill={theme().accentColor} />
      </svg>
    </Show>
  );
}
