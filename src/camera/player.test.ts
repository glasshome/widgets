import { describe, expect, test } from "bun:test";
import {
  activeSource,
  initialState,
  type PlayerEvent,
  type PlayerState,
  transition,
} from "./player";
import type { CameraSource } from "./sources";

const SOURCES: CameraSource[] = [
  { kind: "webrtc" },
  { kind: "hls", needsFetch: true },
  { kind: "mjpeg", url: "/m" },
  { kind: "snapshot", url: "/s" },
];

function run(events: PlayerEvent[], sources = SOURCES, start = initialState): PlayerState {
  return events.reduce((s, e) => transition(s, e, sources), start);
}

describe("player reducer", () => {
  test("a source that never goes live cascades to the next on watchdog", () => {
    const s = run([{ t: "start" }, { t: "watchdog" }]);
    expect(s.status).toBe("connecting");
    expect(activeSource(s, SOURCES)?.kind).toBe("hls");
  });

  test("error and watchdog are the same transition (no source can stall)", () => {
    const viaError = run([{ t: "start" }, { t: "error" }]);
    const viaWatchdog = run([{ t: "start" }, { t: "watchdog" }]);
    expect(viaError).toEqual(viaWatchdog);
  });

  test("exhausting every source lands on no-signal", () => {
    const s = run([{ t: "start" }, { t: "error" }, { t: "error" }, { t: "error" }, { t: "error" }]);
    expect(s.status).toBe("no-signal");
  });

  test("going live stops the cascade", () => {
    const s = run([{ t: "start" }, { t: "watchdog" }, { t: "live" }]);
    expect(s.status).toBe("live");
    expect(activeSource(s, SOURCES)?.kind).toBe("hls");
  });

  test("live then stale reconnects once, a repeat failure advances", () => {
    const reconnecting = run([{ t: "start" }, { t: "live" }, { t: "stale" }]);
    expect(reconnecting.status).toBe("reconnecting");
    expect(activeSource(reconnecting, SOURCES)?.kind).toBe("webrtc");
    const advanced = transition(reconnecting, { t: "watchdog" }, SOURCES);
    expect(advanced.status).toBe("connecting");
    expect(activeSource(advanced, SOURCES)?.kind).toBe("hls");
  });

  test("stale is ignored unless currently live", () => {
    const s = run([{ t: "start" }, { t: "stale" }]);
    expect(s.status).toBe("connecting");
    expect(s.index).toBe(0);
  });

  test("offline entity parks the machine and blocks driver events", () => {
    const off = run([{ t: "start" }, { t: "entity", offline: true }]);
    expect(off.status).toBe("offline");
    expect(transition(off, { t: "watchdog" }, SOURCES).status).toBe("offline");
    expect(transition(off, { t: "live" }, SOURCES).status).toBe("offline");
  });

  test("coming back online restarts from the first source", () => {
    const back = run([
      { t: "start" },
      { t: "entity", offline: true },
      { t: "entity", offline: false },
    ]);
    expect(back.status).toBe("connecting");
    expect(back.index).toBe(0);
  });

  test("connecting -> live keeps gen stable, advance/stale bump it", () => {
    const connecting = run([{ t: "start" }]);
    const live = transition(connecting, { t: "live" }, SOURCES);
    expect(live.gen).toBe(connecting.gen);
    const advanced = transition(connecting, { t: "error" }, SOURCES);
    expect(advanced.gen).toBeGreaterThan(connecting.gen);
    const reconnecting = transition(live, { t: "stale" }, SOURCES);
    expect(reconnecting.gen).toBeGreaterThan(live.gen);
  });

  test("no sources means immediate no-signal", () => {
    expect(transition(initialState, { t: "start" }, []).status).toBe("no-signal");
  });

  test("retry restarts from the top and bumps the frame nonce", () => {
    const exhausted = run([
      { t: "start" },
      { t: "error" },
      { t: "error" },
      { t: "error" },
      { t: "error" },
    ]);
    const retried = transition(exhausted, { t: "retry" }, SOURCES);
    expect(retried.status).toBe("connecting");
    expect(retried.index).toBe(0);
    expect(retried.nonce).toBe(exhausted.nonce + 1);
  });
});
