import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import { createMjpegDriver } from "./drivers/mjpeg";
import { createSnapshotDriver } from "./drivers/snapshot";
import type { DriverCallbacks, MediaDriver } from "./drivers/types";
import { initialState, type PlayerEvent, type PlayerStatus, transition } from "./player";
import type { CameraSource, SourceKind, VideoKind } from "./sources";

// WebRTC waits out HA's own 15s offer timeout, so its driver reports the real reason first.
const WATCHDOG_MS: Record<SourceKind, number> = {
  webrtc: 20000,
  hls: 8000,
  mjpeg: 8000,
  snapshot: 8000,
};

/** One attempt at a video kind: what `CameraStream` plays and the callbacks it reports to. */
export interface VideoAttempt {
  entityId: string;
  kind: VideoKind;
  onLive: () => void;
  onAudio: (has: boolean) => void;
  onError: (reason: string) => void;
  onStale: (reason: string) => void;
  /** A view showed this attempt's stream; a second view starts a fresh attempt for its own stream. */
  mounted: () => void;
}

export interface CameraPlayer {
  status: Accessor<PlayerStatus>;
  activeKind: Accessor<SourceKind | null>;
  hasAudio: Accessor<boolean>;
  nonce: Accessor<number>;
  video: Accessor<VideoAttempt | null>;
  retry: () => void;
  bindEl: (el: HTMLImageElement | null) => void;
  dispose: () => void;
}

export interface CameraPlayerOptions {
  entityId: Accessor<string>;
  sources: Accessor<CameraSource[]>;
  offline: Accessor<boolean>;
  refreshMs: Accessor<number>;
  watchdogMs?: number;
}

export function createCameraPlayer(opts: CameraPlayerOptions): CameraPlayer {
  const [state, setState] = createSignal(initialState);
  const [boundEl, setBoundEl] = createSignal<HTMLImageElement | null>(null);
  const [bindVersion, setBindVersion] = createSignal(0);
  const [hasAudio, setHasAudio] = createSignal(false);
  const [video, setVideo] = createSignal<VideoAttempt | null>(null);

  const bindEl = (el: HTMLImageElement | null) => {
    setBoundEl(el);
    setBindVersion((v) => v + 1);
  };

  let driver: MediaDriver | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let attemptId = 0;
  let started = false;

  const dispatch = (event: PlayerEvent) =>
    setState((s) => transition(s, event, untrack(opts.sources)));

  const clearWatchdog = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
  };
  const stopDriver = () => {
    driver?.stop();
    driver = null;
    setVideo(null);
  };

  const activate = () => {
    stopDriver();
    clearWatchdog();
    setHasAudio(false);
    const s = untrack(state);
    if (s.status === "offline" || s.status === "no-signal") return;
    const source = untrack(opts.sources)[s.index];
    if (!source) {
      dispatch({ t: "error" });
      return;
    }
    const el = untrack(boundEl);
    // An image kind waits for its <img>; a video kind renders its own.
    if (source.kind !== "webrtc" && source.kind !== "hls" && !el) return;

    const attempt = ++attemptId;
    const fail = (t: "error" | "watchdog" | "stale", reason: string) => {
      if (attempt !== attemptId) return;
      console.warn(`[camera] ${untrack(opts.entityId)} ${source.kind} ${t}: ${reason}`);
      dispatch({ t });
    };
    const cb: DriverCallbacks = {
      onLive: () => {
        if (attempt !== attemptId) return;
        clearWatchdog();
        dispatch({ t: "live" });
      },
      onAudio: () => {
        if (attempt === attemptId) setHasAudio(true);
      },
      onError: (reason) => fail("error", reason),
      onStale: (reason) => fail("stale", reason),
    };
    const watchdogMs = opts.watchdogMs ?? WATCHDOG_MS[source.kind];
    watchdog = setTimeout(() => {
      const where = driver?.describe?.();
      fail("watchdog", `no picture within ${watchdogMs / 1000}s${where ? ` (${where})` : ""}`);
    }, watchdogMs);

    if (source.kind === "webrtc" || source.kind === "hls") {
      let shown = false;
      setVideo({
        entityId: untrack(opts.entityId),
        kind: source.kind,
        onLive: cb.onLive,
        onAudio: (has) => {
          if (has) cb.onAudio();
        },
        onError: cb.onError,
        onStale: cb.onStale,
        mounted: () => {
          if (attempt !== attemptId) return;
          if (!shown) {
            shown = true;
            return;
          }
          if (untrack(state).status === "live") dispatch({ t: "stale" });
          else setBindVersion((v) => v + 1);
        },
      });
    } else if (el) {
      driver =
        source.kind === "mjpeg"
          ? createMjpegDriver()
          : createSnapshotDriver(untrack(opts.refreshMs));
      driver.start(el, source, cb);
    }
  };

  // Drive start/restart from connection state; never start twice for one session.
  createEffect(() => {
    const offline = opts.offline();
    if (offline) {
      dispatch({ t: "entity", offline: true });
      return;
    }
    if (untrack(() => started)) {
      dispatch({ t: "entity", offline: false });
    } else {
      started = true;
      dispatch({ t: "start" });
    }
  });

  const attemptKey = createMemo(() => {
    const s = state();
    const version = bindVersion();
    if (s.status === "offline" || s.status === "no-signal") return "stop";
    return `${s.gen}:${version}`;
  });

  createEffect(() => {
    const key = attemptKey();
    if (key === "stop") {
      stopDriver();
      clearWatchdog();
      setHasAudio(false);
      return;
    }
    activate();
  });

  const dispose = () => {
    stopDriver();
    clearWatchdog();
    setHasAudio(false);
  };
  onCleanup(dispose);

  return {
    status: () => state().status,
    activeKind: createMemo(() => {
      const s = state();
      if (s.status === "offline" || s.status === "no-signal") return null;
      return opts.sources()[s.index]?.kind ?? null;
    }),
    hasAudio,
    nonce: () => state().nonce,
    video,
    retry: () => dispatch({ t: "retry" }),
    bindEl,
    dispose,
  };
}
