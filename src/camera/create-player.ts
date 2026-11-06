import { hassMediaUrl } from "@glasshome/widget-sdk";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import { initialState, type PlayerEvent, type PlayerStatus, transition } from "./player";
import type { CameraSource, SourceKind } from "./sources";

// WebRTC waits out HA's own 15s offer timeout, so its stream reports the real reason first.
export const WATCHDOG_MS: Record<SourceKind, number> = {
  webrtc: 20000,
  hls: 8000,
  mjpeg: 8000,
  snapshot: 8000,
};

/** One attempt at a source: what `CameraStream` plays and the callbacks it reports to. */
interface StreamAttempt {
  /** The `CameraStream` session; a new attempt restarts the stream in place. */
  id: number;
  entityId: string;
  kind: "webrtc" | "hls" | "image";
  src: Accessor<string | undefined>;
  onLive: () => void;
  onAudio: (has: boolean) => void;
  onError: (reason: string) => void;
  onStale: (reason: string) => void;
  onStage: (stage: string) => void;
  /** A view showed this attempt's stream; returns its release. A later view gets a fresh attempt once it plays alone. */
  mounted: () => () => void;
}

export interface CameraPlayer {
  status: Accessor<PlayerStatus>;
  activeKind: Accessor<SourceKind | null>;
  hasAudio: Accessor<boolean>;
  nonce: Accessor<number>;
  video: Accessor<StreamAttempt | null>;
  retry: () => void;
  dispose: () => void;
}

export interface CameraPlayerOptions {
  entityId: Accessor<string>;
  sources: Accessor<CameraSource[]>;
  offline: Accessor<boolean>;
  refreshMs: Accessor<number>;
  watchdogMs?: number;
  warn?: (message: string) => void;
}

export function createCameraPlayer(opts: CameraPlayerOptions): CameraPlayer {
  const [state, setState] = createSignal(initialState);
  const [restarts, setRestarts] = createSignal(0);
  const [hasAudio, setHasAudio] = createSignal(false);
  const [video, setVideo] = createSignal<StreamAttempt | null>(null);
  const warn = opts.warn ?? ((message: string) => console.warn(message));

  let watchdog: ReturnType<typeof setTimeout> | null = null;
  let refresh: ReturnType<typeof setInterval> | null = null;
  let attemptId = 0;
  let started = false;

  const dispatch = (event: PlayerEvent) =>
    setState((s) => transition(s, event, untrack(opts.sources)));

  const stop = () => {
    if (watchdog) clearTimeout(watchdog);
    watchdog = null;
    if (refresh) clearInterval(refresh);
    refresh = null;
    setVideo(null);
    setHasAudio(false);
  };

  const viewsOf = (attempt: number, restart: () => void) => {
    let shown = false;
    let views = 0;
    let joined = false;
    // Views that remount in the flush that made this attempt are its first views, never late ones.
    let fresh = true;
    queueMicrotask(() => {
      fresh = false;
    });
    return () => {
      const alone = views === 0;
      views++;
      const release = () => {
        views--;
        if (attempt !== attemptId || !joined || views === 0) return;
        joined = false;
        restart();
      };
      if (attempt !== attemptId) return release;
      if (!shown || fresh) {
        shown = true;
        return release;
      }
      if (alone || untrack(state).status === "live") restart();
      else joined = true;
      return release;
    };
  };

  const activate = () => {
    stop();
    const s = untrack(state);
    if (s.status === "offline" || s.status === "no-signal") return;
    const source = untrack(opts.sources)[s.index];
    if (!source) {
      dispatch({ t: "error" });
      return;
    }

    const attempt = ++attemptId;
    let stage: string | undefined;
    const fail = (t: "error" | "watchdog" | "stale", reason: string) => {
      if (attempt !== attemptId) return;
      warn(`[camera] ${untrack(opts.entityId)} ${source.kind} ${t}: ${reason}`);
      dispatch({ t });
    };
    const watchdogMs = opts.watchdogMs ?? WATCHDOG_MS[source.kind];
    watchdog = setTimeout(
      () =>
        fail("watchdog", `no picture within ${watchdogMs / 1000}s${stage ? ` (${stage})` : ""}`),
      watchdogMs,
    );

    const kind = source.kind === "webrtc" || source.kind === "hls" ? source.kind : "image";
    const isVideo = kind !== "image";
    const url = !isVideo && source.url ? hassMediaUrl(source.url) : undefined;
    const [src, setSrc] = createSignal(url);
    if (!isVideo && !url) {
      fail("error", `no ${source.kind} url`);
      return;
    }
    const refreshMs = untrack(opts.refreshMs);
    if (source.kind === "snapshot" && url && refreshMs > 0) {
      const separator = url.includes("?") ? "&" : "?";
      refresh = setInterval(() => setSrc(`${url}${separator}_ts=${Date.now()}`), refreshMs);
    }

    const restart = () => {
      if (untrack(state).status === "live") dispatch({ t: "stale" });
      else setRestarts((v) => v + 1);
    };
    setVideo({
      id: attempt,
      entityId: untrack(opts.entityId),
      kind,
      src,
      onLive: () => {
        if (attempt !== attemptId) return;
        if (watchdog) clearTimeout(watchdog);
        watchdog = null;
        dispatch({ t: "live" });
      },
      onAudio: (has) => {
        if (has && attempt === attemptId) setHasAudio(true);
      },
      onError: (reason) => fail("error", reason),
      onStale: (reason) => fail("stale", reason),
      onStage: (at) => {
        if (attempt === attemptId) stage = at;
      },
      // Each view of an image loads its own picture; a WebRTC or HLS session plays to one view.
      mounted: isVideo ? viewsOf(attempt, restart) : () => () => {},
    });
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
    const version = restarts();
    if (s.status === "offline" || s.status === "no-signal") return "stop";
    return `${s.gen}:${version}`;
  });

  createEffect(() => {
    if (attemptKey() === "stop") stop();
    else activate();
  });

  onCleanup(stop);

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
    dispose: stop,
  };
}
