import { getStream } from "@glasshome/widget-sdk";
import { type Accessor, createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js";
import { createHlsDriver } from "./drivers/hls";
import { createMjpegDriver } from "./drivers/mjpeg";
import { createSnapshotDriver } from "./drivers/snapshot";
import { createWebRtcDriver } from "./drivers/webrtc";
import type { DriverCallbacks, MediaDriver } from "./drivers/types";
import { initialState, type PlayerEvent, type PlayerStatus, transition } from "./player";
import type { CameraSource, SourceKind } from "./sources";

const DEFAULT_WATCHDOG_MS = 8000;

export interface CameraPlayer {
  status: Accessor<PlayerStatus>;
  activeKind: Accessor<SourceKind | null>;
  nonce: Accessor<number>;
  retry: () => void;
  bindEl: (el: HTMLVideoElement | HTMLImageElement | null) => void;
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
  const [boundEl, setBoundEl] = createSignal<HTMLVideoElement | HTMLImageElement | null>(null);
  const [bindVersion, setBindVersion] = createSignal(0);
  const watchdogMs = opts.watchdogMs ?? DEFAULT_WATCHDOG_MS;

  const bindEl = (el: HTMLVideoElement | HTMLImageElement | null) => {
    setBoundEl(el);
    setBindVersion((v) => v + 1);
  };

  const wantsVideo = (kind: SourceKind) => kind === "webrtc" || kind === "hls";

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
  };

  const makeDriver = (kind: SourceKind): MediaDriver => {
    switch (kind) {
      case "webrtc":
        return createWebRtcDriver(untrack(opts.entityId));
      case "hls":
        return createHlsDriver();
      case "mjpeg":
        return createMjpegDriver();
      case "snapshot":
        return createSnapshotDriver(untrack(opts.refreshMs));
    }
  };

  const activate = () => {
    stopDriver();
    clearWatchdog();
    const s = untrack(state);
    const el = untrack(boundEl);
    if (s.status === "offline" || s.status === "no-signal") return;
    if (!el) return;
    const source = untrack(opts.sources)[s.index];
    if (!source) {
      dispatch({ t: "error" });
      return;
    }
    // Wait until the mounted element type matches the source (video vs img).
    if (wantsVideo(source.kind) !== el instanceof HTMLVideoElement) return;

    const attempt = ++attemptId;
    const live = (event: PlayerEvent) => {
      if (attempt === attemptId) dispatch(event);
    };
    const cb: DriverCallbacks = {
      onLive: () => {
        if (attempt !== attemptId) return;
        clearWatchdog();
        dispatch({ t: "live" });
      },
      onError: () => live({ t: "error" }),
      onStale: () => live({ t: "stale" }),
    };
    watchdog = setTimeout(() => live({ t: "watchdog" }), watchdogMs);

    const launch = (resolved: CameraSource) => {
      if (attempt !== attemptId) return;
      driver = makeDriver(source.kind);
      driver.start(el, resolved, cb);
    };

    if (source.needsFetch) {
      getStream(untrack(opts.entityId), { format: "hls", autoRefresh: true })
        .then((data) => {
          if (attempt !== attemptId) return;
          if (!data.stream.url) {
            dispatch({ t: "error" });
            return;
          }
          launch({ ...source, url: data.stream.url });
        })
        .catch(() => live({ t: "error" }));
    } else {
      launch(source);
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
      return;
    }
    activate();
  });

  const dispose = () => {
    stopDriver();
    clearWatchdog();
  };
  onCleanup(dispose);

  return {
    status: () => state().status,
    activeKind: createMemo(() => {
      const s = state();
      if (s.status === "offline" || s.status === "no-signal") return null;
      return opts.sources()[s.index]?.kind ?? null;
    }),
    nonce: () => state().nonce,
    retry: () => dispatch({ t: "retry" }),
    bindEl,
    dispose,
  };
}
