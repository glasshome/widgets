import { createSignal, onCleanup } from "solid-js";

interface UseSetpointsOptions {
  /** Setpoints from entity attributes: [target] or [low, high]. */
  stateValues: () => number[];
  min: () => number;
  max: () => number;
  step: () => number;
  /** Performs the service call. Grace handling stays inside the hook. */
  commit: (values: number[]) => void;
  commitDebounceMs?: number;
  graceMs?: number;
}

interface UseSetpointsResult {
  values: () => number[];
  setPending: (values: number[]) => void;
  commitValues: (values: number[]) => void;
  stepValue: (index: number, delta: number) => void;
  shiftValues: (delta: number) => void;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function shiftBand(values: number[], delta: number, min: number, max: number): number[] {
  if (values.length === 0) return values;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const d = Math.min(Math.max(delta, min - lo), max - hi);
  return values.map((v) => round1(v + d));
}

/**
 * Optimistic setpoint state shared by temperature controls. Pending values are
 * held while editing plus a grace window after commit, so the slider and
 * readout never snap back to the stale HA attribute mid round-trip.
 */
export function useSetpoints(options: UseSetpointsOptions): UseSetpointsResult {
  const [pending, setPendingSignal] = createSignal<number[] | null>(null);
  let commitDebounce: ReturnType<typeof setTimeout> | undefined;
  let pendingGrace: ReturnType<typeof setTimeout> | undefined;

  const debounceMs = options.commitDebounceMs ?? 400;
  const graceMs = options.graceMs ?? 1500;

  const values = () => pending() ?? options.stateValues();

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const commitWithGrace = (next: number[]) => {
    if (next.length === 0) return;
    options.commit(next);
    if (pendingGrace) clearTimeout(pendingGrace);
    pendingGrace = setTimeout(() => setPendingSignal(null), graceMs);
  };

  const stepValue = (index: number, delta: number) => {
    const base = values();
    if (base.length === 0) return;
    const next = base.slice();
    let v = clamp(round1(base[index] + delta), options.min(), options.max());
    if (base.length === 2) {
      if (index === 0) v = Math.min(v, next[1] - options.step());
      else v = Math.max(v, next[0] + options.step());
    }
    next[index] = v;
    setPendingSignal(next);
    if (commitDebounce) clearTimeout(commitDebounce);
    commitDebounce = setTimeout(() => commitWithGrace(next), debounceMs);
  };

  const shiftValues = (delta: number) => {
    const next = shiftBand(values(), delta, options.min(), options.max());
    if (next.length === 0) return;
    setPendingSignal(next);
    if (commitDebounce) clearTimeout(commitDebounce);
    commitDebounce = setTimeout(() => commitWithGrace(next), debounceMs);
  };

  onCleanup(() => {
    if (commitDebounce) clearTimeout(commitDebounce);
    if (pendingGrace) clearTimeout(pendingGrace);
  });

  return {
    values,
    setPending: (v) => setPendingSignal(v),
    commitValues: commitWithGrace,
    stepValue,
    shiftValues,
  };
}
