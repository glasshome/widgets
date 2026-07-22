import Hls from "hls.js";
import type { CameraSource } from "../sources";
import type { DriverCallbacks, MediaDriver } from "./types";

const MAX_RECOVERIES = 2;

export function createHlsDriver(): MediaDriver {
  let hls: Hls | null = null;
  let el: HTMLVideoElement | null = null;
  let onPlaying: (() => void) | null = null;
  let onNativeError: (() => void) | null = null;

  const stop = () => {
    if (el && onPlaying) el.removeEventListener("playing", onPlaying);
    if (el && onNativeError) el.removeEventListener("error", onNativeError);
    onPlaying = null;
    onNativeError = null;
    el = null;
    if (hls) {
      hls.destroy();
      hls = null;
    }
  };

  const start = (
    element: HTMLVideoElement | HTMLImageElement,
    source: CameraSource,
    cb: DriverCallbacks,
  ) => {
    el = element as HTMLVideoElement;
    const url = source.url;
    if (!url) {
      cb.onError("no hls url");
      return;
    }
    onPlaying = () => cb.onLive();
    el.addEventListener("playing", onPlaying);

    if (Hls.isSupported()) {
      const instance = new Hls({ enableWorker: true, lowLatencyMode: true });
      let mediaRecoveries = 0;
      let networkRecoveries = 0;
      instance.loadSource(url);
      instance.attachMedia(el);
      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (mediaRecoveries++ < MAX_RECOVERIES) {
              instance.recoverMediaError();
            } else {
              instance.destroy();
              cb.onError("hls media error");
            }
            break;
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (networkRecoveries++ < MAX_RECOVERIES) {
              setTimeout(() => instance.startLoad(), 2000);
            } else {
              instance.destroy();
              cb.onError("hls network error");
            }
            break;
          default:
            instance.destroy();
            cb.onError("hls fatal error");
        }
      });
      hls = instance;
    } else if (el.canPlayType("application/vnd.apple.mpegurl")) {
      el.src = url;
      onNativeError = () => cb.onError("native hls error");
      el.addEventListener("error", onNativeError, { once: true });
    } else {
      cb.onError("hls unsupported");
    }
  };

  return { kind: "hls", start, stop };
}
