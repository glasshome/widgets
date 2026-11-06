import { fireEvent, render } from "@solidjs/testing-library";
import { createRoot, createSignal } from "solid-js";
import { describe, expect, test } from "vitest";
import { CameraView } from "../../src/camera/camera-view";
import { CameraLiveView } from "../../src/camera/live-view";
import { type CameraPlayer, createCameraPlayer } from "../../src/camera/create-player";
import type { PlayerStatus } from "../../src/camera/player";

function fakePlayer(hasAudio: boolean) {
  const [status, setStatus] = createSignal<PlayerStatus>("live");
  const player: CameraPlayer = {
    status,
    activeKind: () => "webrtc",
    hasAudio: () => hasAudio,
    nonce: () => 0,
    video: () => ({
      entityId: "camera.front_door",
      kind: "webrtc",
      onLive: () => {},
      onAudio: () => {},
      onError: () => {},
      onStale: () => {},
      mounted: () => {},
    }),
    // test-change-ok retry is the player double's method, not a test retry
    retry: () => {},
    bindEl: () => {},
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

  test("a second view of a live stream reconnects with a fresh attempt", () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted();
    first?.onLive();
    expect(player.status()).toBe("live");

    first?.mounted();
    expect(player.status()).toBe("reconnecting");
    const second = player.video();
    expect(second).not.toBe(first);
    expect(second?.kind).toBe("webrtc");
    dispose();
  });

  test("a second view of a connecting stream starts a fresh attempt on the same source", () => {
    const { player, dispose } = videoPlayer();
    const first = player.video();
    first?.mounted();
    first?.mounted();
    expect(player.status()).toBe("connecting");
    expect(player.video()).not.toBe(first);
    expect(player.video()?.kind).toBe("webrtc");
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
