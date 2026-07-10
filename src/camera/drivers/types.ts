import type { CameraSource, SourceKind } from "../sources";

export interface DriverCallbacks {
  onLive: () => void;
  onError: (reason: string) => void;
  onStale: () => void;
}

export interface MediaDriver {
  kind: SourceKind;
  start: (el: HTMLVideoElement | HTMLImageElement, source: CameraSource, cb: DriverCallbacks) => void;
  stop: () => void;
}
