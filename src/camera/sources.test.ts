import { describe, expect, test } from "bun:test";
import { resolveSources } from "./sources";

const RING = {
  entityId: "camera.front_door",
  entityPicture: "/api/camera_proxy/camera.front_door?token=SIGNED",
  accessToken: null,
};

describe("resolveSources", () => {
  test("auto cascade is webrtc -> hls -> mjpeg -> snapshot", () => {
    expect(resolveSources(RING, "auto").map((s) => s.kind)).toEqual([
      "webrtc",
      "hls",
      "mjpeg",
      "snapshot",
    ]);
  });

  test("snapshot uses the entity_picture signed token (Ring)", () => {
    const snap = resolveSources(RING, "snapshot")[0];
    expect(snap?.url).toBe("/api/camera_proxy/camera.front_door?token=SIGNED");
  });

  test("mjpeg swaps to camera_proxy_stream but keeps the entity_picture token", () => {
    const mjpeg = resolveSources(RING, "mjpeg")[0];
    expect(mjpeg?.url).toBe("/api/camera_proxy_stream/camera.front_door?token=SIGNED");
  });

  test("falls back to access_token when no entity_picture", () => {
    const input = { entityId: "camera.cam", entityPicture: null, accessToken: "TOK" };
    expect(resolveSources(input, "snapshot")[0]?.url).toBe(
      "/api/camera_proxy/camera.cam?token=TOK",
    );
    expect(resolveSources(input, "mjpeg")[0]?.url).toBe(
      "/api/camera_proxy_stream/camera.cam?token=TOK",
    );
  });

  test("hls source is fetch-deferred, webrtc needs only an entity id", () => {
    const list = resolveSources({ entityId: "camera.cam" }, "auto");
    expect(list.map((s) => s.kind)).toEqual(["webrtc", "hls"]);
    expect(list.find((s) => s.kind === "hls")?.needsFetch).toBe(true);
  });

  test("a pinned engine leads and falls only to the lighter kinds below it", () => {
    const kinds = (engine: Parameters<typeof resolveSources>[1]) =>
      resolveSources(RING, engine).map((s) => s.kind);
    expect(kinds("webrtc")).toEqual(["webrtc", "hls", "mjpeg", "snapshot"]);
    expect(kinds("hls")).toEqual(["hls", "mjpeg", "snapshot"]);
    expect(kinds("mjpeg")).toEqual(["mjpeg", "snapshot"]);
    expect(kinds("snapshot")).toEqual(["snapshot"]);
  });

  test("an engine value the schema no longer has reads as auto", () => {
    const stale = "webrtc2" as Parameters<typeof resolveSources>[1];
    expect(resolveSources(RING, stale).map((s) => s.kind)).toEqual([
      "webrtc",
      "hls",
      "mjpeg",
      "snapshot",
    ]);
  });

  test("no entity id and no token yields nothing", () => {
    expect(resolveSources({ entityId: "" }, "auto")).toEqual([]);
  });
});
