import { hassMediaUrl } from "@glasshome/widget-sdk";
import type { CameraSource } from "../sources";
import type { DriverCallbacks, MediaDriver } from "./types";

export function createSnapshotDriver(refreshMs: number): MediaDriver {
  let el: HTMLImageElement | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let onLoad: (() => void) | null = null;
  let onError: (() => void) | null = null;

  const stop = () => {
    if (timer) clearInterval(timer);
    timer = null;
    if (el && onLoad) el.removeEventListener("load", onLoad);
    if (el && onError) el.removeEventListener("error", onError);
    el = null;
    onLoad = null;
    onError = null;
  };

  const start = (
    element: HTMLVideoElement | HTMLImageElement,
    source: CameraSource,
    cb: DriverCallbacks,
  ) => {
    el = element as HTMLImageElement;
    const base = source.url ? hassMediaUrl(source.url) : null;
    if (!base) {
      cb.onError("no snapshot url");
      return;
    }
    onLoad = () => cb.onLive();
    onError = () => cb.onError("snapshot error");
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    el.src = base;

    if (refreshMs > 0) {
      timer = setInterval(() => {
        if (!el) return;
        const separator = base.includes("?") ? "&" : "?";
        el.src = `${base}${separator}_ts=${Date.now()}`;
      }, refreshMs);
    }
  };

  return { kind: "snapshot", start, stop };
}
