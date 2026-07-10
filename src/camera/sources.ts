export type SourceKind = "webrtc" | "hls" | "mjpeg" | "snapshot";
export type StreamEngine = "auto" | SourceKind;

export interface CameraSource {
  kind: SourceKind;
  url?: string | null;
  needsFetch?: boolean;
}

export interface CameraInput {
  entityId: string;
  entityPicture?: string | null;
  accessToken?: string | null;
}

const CASCADE: SourceKind[] = ["webrtc", "hls", "mjpeg", "snapshot"];

function proxyPath(input: CameraInput, streaming: boolean): string | null {
  const seg = streaming ? "camera_proxy_stream" : "camera_proxy";
  if (input.entityPicture) {
    return input.entityPicture.replace("/api/camera_proxy/", `/api/${seg}/`);
  }
  if (input.entityId && input.accessToken) {
    return `/api/${seg}/${input.entityId}?token=${input.accessToken}`;
  }
  return null;
}

function build(kind: SourceKind, input: CameraInput): CameraSource | null {
  switch (kind) {
    case "webrtc":
      return input.entityId ? { kind } : null;
    case "hls":
      return input.entityId ? { kind, needsFetch: true } : null;
    case "mjpeg": {
      const url = proxyPath(input, true);
      return url ? { kind, url } : null;
    }
    case "snapshot": {
      const url = proxyPath(input, false);
      return url ? { kind, url } : null;
    }
  }
}

export function resolveSources(input: CameraInput, engine: StreamEngine): CameraSource[] {
  if (engine !== "auto") {
    const only = build(engine, input);
    return only ? [only] : [];
  }
  return CASCADE.map((kind) => build(kind, input)).filter((s): s is CameraSource => s !== null);
}
