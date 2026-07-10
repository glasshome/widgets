import type { CameraSource } from "./sources";

export type PlayerStatus = "connecting" | "live" | "reconnecting" | "no-signal" | "offline";

export interface PlayerState {
  status: PlayerStatus;
  index: number;
  nonce: number;
  // Bumped on every transition that needs a fresh driver attempt (never on
  // connecting -> live), so the controller re-attaches only when it should.
  gen: number;
}

export type PlayerEvent =
  | { t: "start" }
  | { t: "live" }
  | { t: "error" }
  | { t: "watchdog" }
  | { t: "stale" }
  | { t: "retry" }
  | { t: "entity"; offline: boolean };

export const initialState: PlayerState = { status: "connecting", index: 0, nonce: 0, gen: 0 };

export function transition(
  state: PlayerState,
  event: PlayerEvent,
  sources: CameraSource[],
): PlayerState {
  const gen = state.gen + 1;

  const restart = (nonce: number): PlayerState =>
    sources.length === 0
      ? { status: "no-signal", index: 0, nonce, gen }
      : { status: "connecting", index: 0, nonce, gen };

  const advance = (): PlayerState => {
    const next = state.index + 1;
    return next >= sources.length
      ? { ...state, status: "no-signal" }
      : { ...state, status: "connecting", index: next, gen };
  };

  switch (event.t) {
    case "entity":
      if (event.offline) return { ...state, status: "offline" };
      return state.status === "offline" ? restart(state.nonce) : state;
    case "start":
      return state.status === "offline" ? state : restart(state.nonce);
    case "live":
      return state.status === "offline" ? state : { ...state, status: "live" };
    case "error":
    case "watchdog":
      return state.status === "offline" ? state : advance();
    case "stale":
      return state.status === "live" ? { ...state, status: "reconnecting", gen } : state;
    case "retry":
      return restart(state.nonce + 1);
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

export function activeSource(state: PlayerState, sources: CameraSource[]): CameraSource | null {
  return sources[state.index] ?? null;
}
