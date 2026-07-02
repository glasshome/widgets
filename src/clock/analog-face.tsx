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

/** Per-preset character for the square face: ticks, hands, numerals, font. */
interface SquareStyle {
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

const SQUARE_STYLES: Record<ClockPreset, SquareStyle> = {
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
  analogOptions?: AnalogOptions;
  presetTheme?: AnalogPresetTheme;
}

const defaultTheme: AnalogPresetTheme = {
  faceColor: "rgba(127, 127, 127, 0.08)",
  handColor: "rgb(59, 130, 246)",
  accentColor: "rgb(147, 51, 234)",
  tickColor: "currentColor",
};

const SIZE_MAP: Record<ClockSize, number> = {
  small: 120,
  medium: 160,
  large: 200,
};

export function AnalogClock(props: AnalogClockProps) {
  const theme = () => props.presetTheme ?? defaultTheme;
  const options = () => props.analogOptions ?? { border: false, ticks: "hour" as const };
  const border = () => options().border;
  const ticks = () => options().ticks;

  const clockSize = () => SIZE_MAP[props.size] ?? 120;
  const center = () => clockSize() / 2;
  const radius = () => clockSize() / 2 - 10;

  const timeComponents = createMemo(() => readAnalogTime(props.date, props.timeZone));

  const hourAngle = () => {
    const { hours, minutes } = timeComponents();
    return (hours * 30 + minutes * 0.5) % 360;
  };
  const minuteAngle = () => timeComponents().minutes * 6 + timeComponents().seconds * 0.1;
  const secondAngle = () => timeComponents().seconds * 6;
  // Skip the transition on the 59→0 wrap so the second hand / ring don't unwind.
  const wrap = () => timeComponents().seconds === 0;

  const tickElements = createMemo(() => {
    const t = ticks();
    if (t === "none") return [];

    const tickCount = t === "minute" ? 60 : t === "quarter" ? 4 : 12;
    const tickLength = t === "minute" ? 2 : t === "quarter" ? 8 : 6;
    const tickWidth = t === "minute" ? 1 : 2;
    const r = radius();
    const c = center();

    return Array.from({ length: tickCount }, (_, i) => {
      const angle = ((i * 360) / tickCount - 90) * (Math.PI / 180);
      const major = t === "minute" && i % 5 === 0;
      const len = major ? tickLength + 3 : tickLength;
      return {
        x1: c + (r - len) * Math.cos(angle),
        y1: c + (r - len) * Math.sin(angle),
        x2: c + r * Math.cos(angle),
        y2: c + r * Math.sin(angle),
        width: major ? tickWidth + 1 : tickWidth,
      };
    });
  });

  const ringCircumference = () => 2 * Math.PI * radius();
  const ringOffset = () => ringCircumference() * (1 - timeComponents().seconds / 60);

  const handStyle = (angle: number, animate: boolean) => ({
    "transform-origin": `${center()}px ${center()}px`,
    transform: `rotate(${angle}deg)`,
    transition: animate
      ? wrap()
        ? "none"
        : "transform 200ms cubic-bezier(0.25, 1, 0.5, 1)"
      : "transform 600ms cubic-bezier(0.4, 0, 0.2, 1)",
  });

  const gradId = createMemo(() => `clock-face-${Math.round(clockSize())}`);

  return (
    <svg
      width={clockSize()}
      height={clockSize()}
      viewBox={`0 0 ${clockSize()} ${clockSize()}`}
      class="overflow-visible drop-shadow-lg"
    >
      <defs>
        <radialGradient id={gradId()} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stop-color="rgba(255,255,255,0.10)" />
          <stop offset="100%" stop-color="rgba(0,0,0,0.10)" />
        </radialGradient>
      </defs>

      {/* Face */}
      <circle cx={center()} cy={center()} r={radius()} fill={theme().faceColor} />
      <circle cx={center()} cy={center()} r={radius()} fill={`url(#${gradId()})`} />
      <Show when={border()}>
        <circle
          cx={center()}
          cy={center()}
          r={radius()}
          fill="none"
          stroke={theme().tickColor}
          stroke-width={2}
          opacity={0.5}
        />
      </Show>

      {/* Seconds progress ring */}
      <Show when={props.showSeconds}>
        <circle
          cx={center()}
          cy={center()}
          r={radius()}
          fill="none"
          stroke={theme().accentColor}
          stroke-width={2.5}
          stroke-linecap="round"
          stroke-dasharray={`${ringCircumference()}`}
          stroke-dashoffset={`${ringOffset()}`}
          transform={`rotate(-90 ${center()} ${center()})`}
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

      {/* Hour hand */}
      <g style={handStyle(hourAngle(), false)}>
        <line
          x1={center()}
          y1={center() + radius() * 0.12}
          x2={center()}
          y2={center() - radius() * 0.5}
          stroke={theme().handColor}
          stroke-width={5}
          stroke-linecap="round"
        />
      </g>

      {/* Minute hand */}
      <g style={handStyle(minuteAngle(), false)}>
        <line
          x1={center()}
          y1={center() + radius() * 0.16}
          x2={center()}
          y2={center() - radius() * 0.74}
          stroke={theme().handColor}
          stroke-width={3.5}
          stroke-linecap="round"
        />
      </g>

      {/* Second hand */}
      <Show when={props.showSeconds}>
        <g style={handStyle(secondAngle(), true)}>
          <line
            x1={center()}
            y1={center() + radius() * 0.22}
            x2={center()}
            y2={center() - radius() * 0.84}
            stroke={theme().accentColor}
            stroke-width={1.5}
            stroke-linecap="round"
          />
          <circle cx={center()} cy={center() - radius() * 0.84} r={2.5} fill={theme().accentColor} />
        </g>
      </Show>

      {/* Center cap */}
      <circle cx={center()} cy={center()} r={5.5} fill={theme().handColor} />
      <circle cx={center()} cy={center()} r={2} fill={theme().faceColor} />
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
    const corner = 14; // matches the rounded-xl shell so the trace hugs the corners
    const w = Math.max(d.width, 1);
    const h = Math.max(d.height, 1);
    return { w, h, pad, corner, cx: w / 2, cy: h / 2, hw: w / 2 - pad, hh: h / 2 - pad };
  });

  const style = () => SQUARE_STYLES[props.preset] ?? SQUARE_STYLES.minimal;

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

  const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

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
    const { w, h, pad, corner, cx } = dims();
    const r = corner;
    const x0 = pad;
    const y0 = pad;
    const x1 = w - pad;
    const y1 = h - pad;
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
    const { cx, cy } = dims();
    const tipY = () => cy - handLen() * p.lenFrac;
    const baseY = () => cy + handLen() * p.tailFrac;
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
              x1={cx}
              y1={baseY()}
              x2={cx}
              y2={tipY()}
              stroke={paint()}
              stroke-width={p.width}
              stroke-linecap="round"
            />
          }
        >
          <polygon
            points={`${cx - p.width / 2},${baseY()} ${cx - p.width * 0.22},${tipY()} ${cx + p.width * 0.22},${tipY()} ${cx + p.width / 2},${baseY()}`}
            fill={paint()}
          />
        </Show>
        <Show when={p.ornate}>
          <polygon
            points={`${cx},${tipY() + handLen() * 0.16} ${cx + p.width * 1.6},${tipY() + handLen() * 0.08} ${cx},${tipY()} ${cx - p.width * 1.6},${tipY() + handLen() * 0.08}`}
            fill={paint()}
          />
          <circle cx={cx} cy={baseY()} r={p.width * 1.3} fill="none" stroke={paint()} stroke-width={1.5} />
        </Show>
      </g>
    );
  };

  const hourW = () => (style().hand === "bar" ? 10 : style().hand === "line" ? 3.5 : 9);
  const minuteW = () => (style().hand === "bar" ? 7 : style().hand === "line" ? 2.5 : 6.5);
  const ornate = () => props.preset === "classic";
  const glowHands = () => props.preset === "modern" || props.preset === "bold";
  const gradHands = () => props.preset !== "classic";

  return (
    <Show when={ctx.dimensions().width > 0}>
      <svg
        width={dims().w}
        height={dims().h}
        viewBox={`0 0 ${dims().w} ${dims().h}`}
        preserveAspectRatio="none"
        class="absolute left-0 top-0"
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
          <radialGradient id={`${gid()}-vignette`} cx="50%" cy="40%" r="75%">
            <stop offset="60%" stop-color="rgba(255,255,255,0)" />
            <stop offset="100%" stop-color="rgba(0,0,0,0.16)" />
          </radialGradient>
        </defs>

        {/* Subtle face vignette */}
        <rect x="0" y="0" width={dims().w} height={dims().h} fill={`url(#${gid()}-vignette)`} />

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
          <path d={roundedRect(dims().pad, 14)} fill="none" stroke={theme().tickColor} stroke-width={2} opacity={0.35} />
          <path d={roundedRect(dims().pad + 6, 11)} fill="none" stroke={theme().tickColor} stroke-width={1} opacity={0.25} />
        </Show>

        {/* User-toggled outline (kept for non-classic) */}
        <Show when={border() && props.preset !== "classic"}>
          <path d={perimeter()} fill="none" stroke={theme().tickColor} stroke-width={2} opacity={0.4} />
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
          <circle cx={dims().cx} cy={dims().cy} r={9} fill="none" stroke={theme().handColor} stroke-width={1} opacity={0.6} />
        </Show>
        <circle cx={dims().cx} cy={dims().cy} r={1.6} fill={theme().accentColor} />
      </svg>
    </Show>
  );
}
