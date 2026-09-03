import { createMemo, Show } from "solid-js";
import { arcPath, arcPoint, dayProgress, type SunTimes } from "./horizon";

const W = 1000;
const H = 26;

/** The day behind the header: sun arc, now on the curve, night dimmed. */
export function Band(props: { now: Date; times: SunTimes; temperature?: string | null }) {
  const progress = createMemo(() => dayProgress(props.now, props.times));
  const marker = createMemo(() => {
    const t = progress();
    return t === null ? null : arcPoint(W, H, t);
  });
  const isNight = createMemo(() => {
    const t = progress();
    return t === null || t === 0 || t === 1;
  });

  return (
    <Show when={progress() !== null}>
      <svg
        class="pointer-events-none absolute inset-x-0 bottom-0 h-[46px] w-full"
        viewBox={`0 -${H} ${W} ${H * 2}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <title>Daylight</title>
        <defs>
          <linearGradient id="gh-header-day" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.05" />
            <stop offset="50%" stop-color="var(--primary)" stop-opacity="0.28" />
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.05" />
          </linearGradient>
        </defs>
        <path d={arcPath(W, H)} fill="none" stroke="url(#gh-header-day)" stroke-width="2" />
        <Show when={marker()}>
          {(p) => (
            <circle
              cx={p().x}
              cy={p().y}
              r={isNight() ? 3 : 5}
              fill="var(--primary)"
              opacity={isNight() ? 0.4 : 0.9}
            />
          )}
        </Show>
      </svg>
    </Show>
  );
}
