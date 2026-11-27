import { useEntityCommand } from "@glasshome/widget-sdk";
import { onCleanup } from "solid-js";
import { round1, shiftBand } from "./shift-band";

interface UseSetpointsOptions {
  /** Setpoints from entity attributes: [target] or [low, high]. */
  stateValues: () => number[];
  min: () => number;
  max: () => number;
  step: () => number;
  /** Performs the service call; resolves when Home Assistant accepted it. */
  commit: (values: number[]) => Promise<unknown> | void;
  commitDebounceMs?: number;
}

interface UseSetpointsResult {
  values: () => number[];
  setPending: (values: number[]) => void;
  commitValues: (values: number[]) => void;
  stepValue: (index: number, delta: number) => void;
  shiftValues: (delta: number) => void;
}

/**
 * Setpoint state shared by temperature controls. A dragged or committed value shows until the
 * entity reports it, so the slider and readout never snap back to the stale attribute mid round-trip.
 */
export function useSetpoints(options: UseSetpointsOptions): UseSetpointsResult {
  const command = useEntityCommand<number[]>({
    reported: options.stateValues,
    send: (values) => options.commit(values),
    arrived: (reported, target) => {
      const within = Math.max(options.step() / 2, 0.05);
      return (
        reported.length === target.length &&
        reported.every((v, i) => Math.abs(v - (target[i] ?? v)) <= within)
      );
    },
  });
  let commitDebounce: ReturnType<typeof setTimeout> | undefined;

  const debounceMs = options.commitDebounceMs ?? 400;

  const values = command.value;

  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

  const commitValues = (next: number[]) => {
    if (next.length === 0) return;
    void command.run(next);
  };

  const hold = (next: number[]) => {
    command.hold(next);
    clearTimeout(commitDebounce);
    commitDebounce = setTimeout(() => commitValues(next), debounceMs);
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
    hold(next);
  };

  const shiftValues = (delta: number) => {
    const next = shiftBand(values(), delta, options.min(), options.max());
    if (next.length === 0) return;
    hold(next);
  };

  onCleanup(() => clearTimeout(commitDebounce));

  return {
    values,
    setPending: command.hold,
    commitValues,
    stepValue,
    shiftValues,
  };
}
