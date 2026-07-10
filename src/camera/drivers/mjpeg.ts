import { hassMediaUrl } from "@glasshome/widget-sdk";
import type { CameraSource } from "../sources";
import type { DriverCallbacks, MediaDriver } from "./types";

export function createMjpegDriver(): MediaDriver {
  let el: HTMLImageElement | null = null;
  let onLoad: (() => void) | null = null;
  let onError: (() => void) | null = null;

  const stop = () => {
    if (el && onLoad) el.removeEventListener("load", onLoad);
    if (el && onError) el.removeEventListener("error", onError);
    if (el) el.removeAttribute("src");
    el = null;
    onLoad = null;
    onError = null;
  };

  const start = (element: HTMLVideoElement | HTMLImageElement, source: CameraSource, cb: DriverCallbacks) => {
    el = element as HTMLImageElement;
    const url = source.url ? hassMediaUrl(source.url) : null;
    if (!url) {
      cb.onError("no mjpeg url");
      return;
    }
    onLoad = () => cb.onLive();
    onError = () => cb.onError("mjpeg error");
    el.addEventListener("load", onLoad);
    el.addEventListener("error", onError);
    el.src = url;
  };

  return { kind: "mjpeg", start, stop };
}
