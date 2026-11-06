import { fireEvent, render } from "@solidjs/testing-library";
import { createRoot, createSignal } from "solid-js";
import { useFakeTime } from "@glasshome/ui/testing";
import { describe, expect, test, vi } from "vitest";
import { CameraView } from "../../src/camera/camera-view";
import { CameraLiveView } from "../../src/camera/live-view";
import { type CameraPlayer, createCameraPlayer, WATCHDOG_MS } from "../../src/camera/create-player";
import type { PlayerStatus } from "../../src/camera/player";

function fakePlayer(hasAudio: boolean) {
  const [status, setStatus] = createSignal<PlayerStatus>("live");
  const player: CameraPlayer = {
    status,
    activeKind: () => "webrtc",
    hasAudio: () => hasAudio,
    nonce: () => 0,
    video: () => ({
      id: 1,
      entityId: "camera.front_door",
      kind: "webrtc",
      src: () => undefined,
      onLive: () => {},
      onAudio: () => {},
      onError: () => {},
      onStale: () => {},
      onStage: () => {},
      mounted: () => () => {},
    }),
    // test-change-ok retry is the player double's method, not a test retry
    retry: () => {},
    dispose: () => {},
  };
  return { player, setStatus };
}

function mount(hasAudio: boolean) {
  const { player, setStatus } = fakePlayer(hasAudio);
  const [muted, setMuted] = createSignal(true);
  const view = render(() => (
    <CameraView
      player={player}
      poster={() => undefined}
      name={() => "Front Door"}
      active={() => true}
      muted={muted}
      setMuted={setMuted}
    />
  ));
  const video = () => view.container.querySelector("video");
  const sound = () => view.queryByRole("button");
  return { view, video, sound, setStatus };
}

describe("camera sound", () => {
  test("a stream with audio starts muted and a tap turns sound on and off", () => {
    const { video, sound } = mount(true);
    expect(video()?.muted).toBe(true);
    const button = sound();
    expect(button?.getAttribute("aria-label")).toBe("Turn sound on");

    if (button) fireEvent.click(button);
    expect(video()?.muted).toBe(false);
    expect(sound()?.getAttribute("aria-label")).toBe("Turn sound off");

    const off = sound();
    if (off) fireEvent.click(off);
    expect(video()?.muted).toBe(true);
  });

  test("a stream without audio shows no sound button", () => {
    const { video, sound } = mount(false);
    expect(video()).not.toBeNull();
    expect(sound()).toBeNull();
  });

  test("the sound button leaves when the stream drops", () => {
    const { sound, setStatus } = mount(true);
    expect(sound()).not.toBeNull();
    setStatus("no-signal");
    expect(sound()).toBeNull();
  });
});

describe("camera player", () => {
  function videoPlayer() {
    return createRoot((dispose) => {
      const player = createCameraPlayer({
        entityId: () => "camera.front_door",
        sources: () => [{ kind: "webrtc" }, { kind: "hls" }],
        offline: () => false,
        refreshMs: () => 10_000,
      });
      return { player, dispose };
    });
  }

  const settled = () => Promise.resolve();

  test("a second view of a live stream reconnects with a fresh attempt", async () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted()();
    first?.onLive();
    expect(player.status()).toBe("live");
    await settled();

    first?.mounted();
    expect(player.status()).toBe("reconnecting");
    const second = player.video();
    expect(second).not.toBe(first);
    expect(second?.kind).toBe("webrtc");
    dispose();
  });

  test("a later view of a connecting stream no view holds starts a fresh attempt on the same source", async () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted()();
    await settled();
    first?.mounted();
    expect(player.status()).toBe("connecting");
    expect(player.video()).not.toBe(first);
    expect(player.video()?.kind).toBe("webrtc");
    dispose();
  });

  test("a view joining a connecting stream gets a fresh attempt once the other view leaves", async () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    const sheet = first?.mounted();
    await settled();
    first?.mounted();
    expect(player.video()).toBe(first);

    sheet?.();
    expect(player.status()).toBe("connecting");
    expect(player.video()).not.toBe(first);
    dispose();
  });

  test("two views remounting a live stream restart it once, and the closing view leaves it alone", async () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted();
    first?.onLive();
    await settled();
    first?.mounted();
    const second = player.video();
    expect(second).not.toBe(first);

    const sheet = second?.mounted();
    second?.mounted();
    await settled();
    sheet?.();
    expect(player.video()).toBe(second);
    expect(player.status()).toBe("reconnecting");
    dispose();
  });

  test("a stale attempt's view changes nothing", () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted();
    first?.onError("no route");
    const second = player.video();
    expect(second?.kind).toBe("hls");
    first?.mounted();
    expect(player.video()).toBe(second);
    dispose();
  });
});

describe("camera full screen", () => {
  const REFRESH_MS = 10_000;

  function imagePlayer(kind: "mjpeg" | "snapshot", url: string) {
    return createRoot((dispose) => {
      const player = createCameraPlayer({
        entityId: () => "camera.front_door",
        sources: () => [{ kind, url }],
        offline: () => false,
        refreshMs: () => REFRESH_MS,
      });
      return { player, dispose };
    });
  }

  const MJPEG = "/api/camera_proxy_stream/camera.front_door?token=t";

  function mountImage(kind: "mjpeg" | "snapshot", url: string) {
    let player!: CameraPlayer;
    const [muted, setMuted] = createSignal(true);
    const view = render(() => {
      player = createCameraPlayer({
        entityId: () => "camera.front_door",
        sources: () => [{ kind, url }],
        offline: () => false,
        refreshMs: () => REFRESH_MS,
      });
      return (
        <CameraView
          player={player}
          poster={() => undefined}
          name={() => "Front Door"}
          active={() => true}
          muted={muted}
          setMuted={setMuted}
          variant="live"
          fullscreen
        />
      );
    });
    const picture = () => view.container.querySelector(`img[src^="${url}"]`);
    return { view, player, picture };
  }

  test("an MJPEG camera plays through the camera stream, where full screen lives", () => {
    const { player, picture } = mountImage("mjpeg", MJPEG);
    expect(player.video()?.kind).toBe("image");
    expect(picture()?.getAttribute("src")).toBe(MJPEG);
    expect(picture()?.parentElement?.querySelector("video")).not.toBeNull();
  });

  test("a snapshot camera refreshes its picture in place, on the same stream, until it stops", async () => {
    useFakeTime();
    const url = "/api/camera_proxy/camera.front_door?token=t";
    const { player, dispose } = imagePlayer("snapshot", url);
    const stream = player.video();
    stream?.mounted();
    expect(stream?.src()).toBe(url);
    stream?.onLive();
    await vi.advanceTimersByTimeAsync(REFRESH_MS);
    expect(player.video()).toBe(stream);
    const refreshed = stream?.src();
    expect(refreshed).toMatch(/^\/api\/camera_proxy\/camera\.front_door\?token=t&_ts=\d+$/);
    dispose();
    await vi.advanceTimersByTimeAsync(REFRESH_MS);
    expect(stream?.src()).toBe(refreshed);
  });

  test("a reconnect restarts the stream in place, so a full screen picture stays", () => {
    const { player, picture } = mountImage("mjpeg", MJPEG);
    const first = player.video();
    const stage = picture()?.parentElement;
    first?.onLive();
    first?.onStale("stream ended");
    expect(player.status()).toBe("reconnecting");
    expect(player.video()).not.toBe(first);
    expect(picture()?.parentElement).toBe(stage);
  });

  test("an attempt no view shows waits for one before its watchdog runs", async () => {
    useFakeTime();
    const { player, dispose } = imagePlayer("snapshot", "/api/camera_proxy/camera.front_door");
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS.snapshot);
    expect(player.status()).toBe("connecting");
    player.video()?.mounted();
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS.snapshot);
    expect(player.status()).toBe("no-signal");
    dispose();
  });

  test("the watchdog names where a stream that never played stands", async () => {
    useFakeTime();
    const warned: string[] = [];
    const { player, dispose } = createRoot((dispose) => ({
      player: createCameraPlayer({
        entityId: () => "camera.front_door",
        sources: () => [{ kind: "webrtc" }, { kind: "hls" }],
        offline: () => false,
        refreshMs: () => REFRESH_MS,
        warn: (message) => warned.push(message),
      }),
      dispose,
    }));
    player.video()?.mounted();
    player.video()?.onStage("stage home assistant answer, connection new");
    await vi.advanceTimersByTimeAsync(WATCHDOG_MS.webrtc);
    expect(warned).toEqual([
      "[camera] camera.front_door webrtc watchdog: no picture within 20s (stage home assistant answer, connection new)",
    ]);
    expect(player.video()?.kind).toBe("hls");
    dispose();
  });
});

describe("camera live view", () => {
  function mountLive(hasAudio: boolean) {
    const { player, setStatus } = fakePlayer(hasAudio);
    const [muted, setMuted] = createSignal(true);
    const view = render(() => (
      <CameraLiveView
        player={player}
        poster={() => undefined}
        name={() => "Front Door"}
        muted={muted}
        setMuted={setMuted}
        facts={() => ({ model: "Reolink E1 Zoom", motionDetection: true })}
      />
    ));
    return { view, setStatus };
  }

  test("names the stream, its sound, motion detection and the model", () => {
    const { view } = mountLive(true);
    expect(view.getByText("WebRTC")).toBeTruthy();
    expect(view.getByText("Available")).toBeTruthy();
    expect(view.getByText("On")).toBeTruthy();
    expect(view.getByText("Reolink E1 Zoom")).toBeTruthy();
    expect(view.getByRole("button", { name: "Turn sound on" })).toBeTruthy();
  });

  test("a lost stream offers a retry button", () => {
    const { view, setStatus } = mountLive(false);
    expect(view.queryByRole("button", { name: "Retry" })).toBeNull();
    setStatus("no-signal");
    expect(view.getByRole("button", { name: "Retry" })).toBeTruthy();
  });
});
