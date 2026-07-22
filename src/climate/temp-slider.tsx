import { createSignal, For, Show } from "solid-js";

// Self-contained slider. NOTE for the future: @glasshome/ui is *external* to
// widget bundles (host-provided import map, see widget-sdk `isWidgetExternal`)
// and is NOT part of the versioned SDK contract. A widget therefore cannot rely
// on any ui API newer than what the oldest running host ships, with no version
// guard to catch the mismatch. The host ui `Slider` is single-thumb only, so a
// dual-thumb (heat_cool) control has to live in the bundle. Rule of thumb: if a
// widget needs it guaranteed at runtime, bundle it, don't import it from ui.

interface TempSliderProps {
  // [target] in single-setpoint modes, [low, high] in heat_cool range mode.
  values: number[];
  min: number;
  max: number;
  step: number;
  // Per-thumb accent, indexed by thumb. Falls back to var(--primary).
  colors: string[];
  // Track fill (solid colour or gradient) for the band between the thumbs.
  fill: string;
  currentTemp: number | undefined;
  onInput: (values: number[]) => void;
  onCommit: (values: number[]) => void;
}

export function TempSlider(props: TempSliderProps) {
  let trackRef: HTMLDivElement | undefined;
  const [active, setActive] = createSignal<number | null>(null);

  const pct = (v: number) => ((v - props.min) / (props.max - props.min)) * 100;

  const snap = (raw: number) => {
    const stepped = props.min + Math.round((raw - props.min) / props.step) * props.step;
    return Math.min(Math.max(Math.round(stepped * 100) / 100, props.min), props.max);
  };

  const valueFromClientX = (clientX: number) => {
    const rect = trackRef?.getBoundingClientRect();
    if (!rect || rect.width === 0) return props.min;
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    return snap(props.min + ratio * (props.max - props.min));
  };

  const nearestIndex = (v: number) => {
    if (props.values.length < 2) return 0;
    return Math.abs(v - props.values[0]) <= Math.abs(v - props.values[1]) ? 0 : 1;
  };

  // Move one thumb, keeping low below high by at least one step in range mode.
  const withThumb = (index: number, v: number) => {
    const next = props.values.slice();
    let nv = v;
    if (next.length === 2) {
      if (index === 0) nv = Math.min(nv, next[1] - props.step);
      else nv = Math.max(nv, next[0] + props.step);
    }
    next[index] = Math.min(Math.max(nv, props.min), props.max);
    return next;
  };

  const onDown = (e: PointerEvent) => {
    const v = valueFromClientX(e.clientX);
    const idx = nearestIndex(v);
    setActive(idx);
    if (e.currentTarget instanceof HTMLElement) e.currentTarget.setPointerCapture(e.pointerId);
    props.onInput(withThumb(idx, v));
    e.preventDefault();
  };

  const onMove = (e: PointerEvent) => {
    const idx = active();
    if (idx === null) return;
    props.onInput(withThumb(idx, valueFromClientX(e.clientX)));
  };

  const onUp = (e: PointerEvent) => {
    const idx = active();
    if (idx === null) return;
    const next = withThumb(idx, valueFromClientX(e.clientX));
    setActive(null);
    props.onCommit(next);
  };

  const fillLeft = () => (props.values.length === 2 ? pct(props.values[0]) : 0);
  const fillRight = () => pct(props.values[props.values.length === 2 ? 1 : 0]);

  const marker = () => {
    const c = props.currentTemp;
    return c === undefined ? null : pct(c);
  };

  return (
    <div
      ref={trackRef}
      class="relative h-7 w-full cursor-pointer touch-none select-none rounded-full bg-muted"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <div
        class="absolute top-0 bottom-0 rounded-full"
        style={{ left: `${fillLeft()}%`, right: `${100 - fillRight()}%`, background: props.fill }}
      />
      <Show when={marker() !== null}>
        <div
          class="absolute top-1/2 h-3.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded bg-foreground/60"
          style={{ left: `${marker()}%` }}
        />
      </Show>
      <For each={props.values}>
        {(v, i) => (
          <div
            class="absolute top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 bg-background shadow-md"
            style={{ left: `${pct(v)}%`, "border-color": props.colors[i()] ?? "var(--primary)" }}
            role="slider"
            tabIndex={0}
            aria-valuemin={props.min}
            aria-valuemax={props.max}
            aria-valuenow={v}
          />
        )}
      </For>
    </div>
  );
}
