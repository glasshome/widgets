import { render } from "@solidjs/testing-library";
import type { EntityView } from "@glasshome/widget-sdk";
import type { StateTexts } from "@glasshome/widget-contract/state-texts";
import { useSystemTime } from "@glasshome/ui/testing";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { createSignal } from "solid-js";
import { describe, expect, test } from "vitest";
import { BinarySensorSheet, sensorLine } from "../../src/binary-sensor/sheet";
import { getBinarySensorStateText } from "../../src/binary-sensor/utils";
import { CameraView } from "../../src/camera/camera-view";
import type { CameraPlayer } from "../../src/camera/create-player";
import { actionWord, degrees, fanWord, hvacWord, targetText } from "../../src/climate/words";
import { mediaEyebrow, mediaStateWord, volumeText } from "../../src/media-player/words";
import { resolveSlideshow } from "../../src/picture-frame/slideshow";
import { formatSensorValue, sensorClass, sparkValue } from "../../src/sensor/utils";
import { catalogsOf, language } from "../catalog";

const word = (dir: string, tag: string, key: string): string => {
  const parts = catalogsOf(dir)[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${dir} ${tag} ${key}`);
  return parts[0];
};

const tools = (dir: string, tag: "en" | "fr" | "de", states?: StateTexts) =>
  languageTools({ ...language(dir, tag), states });

const sample = (domain: string, state: string, platform = "template") =>
  ({ domain, state, platform, deviceClass: null, attributes: {} }) as EntityView;

const keep = (raw: string) => raw;

describe("climate", () => {
  test("climate names heat_cool in French from its catalog", () => {
    const fr = word("climate", "fr", "climate.mode.heat-cool");
    expect(hvacWord(tools("climate", "fr"), undefined, "heat_cool", keep)).toBe(fr);
    expect(hvacWord(tools("climate", "fr"), undefined, "fan_only", keep)).toBe(
      word("climate", "fr", "climate.mode.fan-only"),
    );
    expect(hvacWord(tools("climate", "fr"), undefined, "cool", keep)).toBe(
      word("climate", "fr", "climate.mode.cool"),
    );
  });

  test("climate names heat_cool Auto with no catalog", () => {
    const en = tools("climate", "en");
    expect(hvacWord(en, undefined, "heat_cool", keep)).toBe("Auto");
    expect(hvacWord(en, undefined, "fan_only", keep)).toBe("Fan");
    expect(hvacWord(en, undefined, "heat", keep)).toBe("Heat");
    expect(hvacWord(en, undefined, "eco", keep)).toBe("eco");
  });

  test("climate keeps its own word for heat_cool when Home Assistant has one", () => {
    const states: StateTexts = {
      component: {
        climate: { _: { state: { heat_cool: "Chauffage/climatisation", heat: "Chauffe" } } },
      },
      entity: {},
    };
    const fr = tools("climate", "fr", states);
    expect(hvacWord(fr, sample("climate", "heat_cool"), "heat_cool", keep)).toBe(
      word("climate", "fr", "climate.mode.heat-cool"),
    );
    expect(hvacWord(fr, sample("climate", "heat"), "heat", keep)).toBe("Chauffe");
  });

  test("the thermostat shows 20,5 °C in German", () => {
    const de = tools("climate", "de");
    expect(targetText(de, [20.5], "C")).toBe("20,5 °C");
    expect(degrees(de, 20.5)).toBe("20,5");
    expect(degrees(de, 21)).toBe("21");
    expect(targetText(de, [68.5], "F")).toBe("68,5 °F");
    expect(targetText(de, [19, 24.5], "C")).toBe(
      de.t("climate.target.range", { low: "19 °C", high: "24,5 °C" }),
    );
  });

  test("the thermostat names fan modes and actions from Home Assistant, then its catalog", () => {
    const states: StateTexts = {
      component: { climate: { _: { attributes: { hvac_action: { heating: "Chauffe" } } } } },
      entity: {},
    };
    const fr = tools("climate", "fr", states);
    const entity = sample("climate", "heat");
    expect(actionWord(fr, entity, "heating")).toBe("Chauffe");
    expect(actionWord(fr, entity, "cooling")).toBe(word("climate", "fr", "climate.action.cooling"));
    expect(fanWord(fr, entity, "medium", keep)).toBe(word("climate", "fr", "climate.fan.medium"));
    expect(fanWord(fr, entity, "turbo", keep)).toBe("turbo");
  });
});

describe("media player", () => {
  const states: StateTexts = {
    component: { media_player: { _: { state: { playing: "Lecture" } } } },
    entity: {},
  };

  test("the media player shows HA's word for playing", () => {
    expect(
      mediaStateWord(tools("media-player", "fr", states), sample("media_player", "playing")),
    ).toBe("Lecture");
  });

  test("the media player falls back to its catalog for paused and keeps the artist", () => {
    const fr = tools("media-player", "fr");
    const paused = sample("media_player", "paused");
    expect(mediaStateWord(fr, paused)).toBe(
      word("media-player", "fr", "media-player.state.paused"),
    );
    expect(mediaEyebrow(fr, paused, "Nina")).toBe(
      `Nina · ${word("media-player", "fr", "media-player.state.paused")}`,
    );
    expect(mediaEyebrow(fr, sample("media_player", "playing"), "Nina")).toBe("Nina");
  });

  test("the media player reads English with no catalog", () => {
    const en = tools("media-player", "en");
    expect(mediaStateWord(en, sample("media_player", "idle"))).toBe("Idle");
    expect(mediaStateWord(en, sample("media_player", "jammed"))).toBe("Jammed");
    expect(volumeText(en, 70)).toBe("70%");
  });
});

describe("sensor", () => {
  test("the sensor sparkline labels its last value in German", () => {
    const de = tools("sensor", "de");
    expect(formatSensorValue(de, 1234.5, null)).toBe("1.234,5");
    expect(sparkValue(de, 21.5)).toBe("21,5");
    expect(sparkValue(de, 1234.5)).toBe("1.235");
  });

  test("the sensor reads English with no catalog", () => {
    const en = tools("sensor", "en");
    expect(formatSensorValue(en, 1234.5, null)).toBe("1,234.5");
    expect(formatSensorValue(en, 21.456, "humidity")).toBe("21");
    expect(sensorClass(en, "signal_strength")).toBe("Signal strength");
    // test-change-ok an unmapped device class reads the generic name, never an English identifier
    expect(sensorClass(en, "wind_speed")).toBe("Sensor");
    expect(sensorClass(en, null)).toBe("Sensor");
  });

  test("the sensor names its class in French from its catalog", () => {
    expect(sensorClass(tools("sensor", "fr"), "humidity")).toBe(
      word("sensor", "fr", "sensor.class.humidity"),
    );
  });
});

describe("binary sensor", () => {
  const states: StateTexts = {
    component: {
      binary_sensor: { _: { state: { on: "Activé" } }, door: { state: { on: "Ouverte" } } },
    },
    entity: {},
  };

  test("a door reads Open from Home Assistant first, then from the catalog", () => {
    expect(
      getBinarySensorStateText(tools("binary-sensor", "fr", states), undefined, "door", true),
    ).toBe("Ouverte");
    const fr = tools("binary-sensor", "fr");
    expect(getBinarySensorStateText(fr, undefined, "door", true)).toBe(
      word("binary-sensor", "fr", "binary-sensor.state.open"),
    );
    expect(getBinarySensorStateText(fr, undefined, "door", false)).toBe(
      word("binary-sensor", "fr", "binary-sensor.state.closed"),
    );
    expect(getBinarySensorStateText(fr, undefined, null, true)).toBe(
      word("binary-sensor", "fr", "binary-sensor.state.on"),
    );
  });

  test("a binary sensor reads English with no catalog", () => {
    const en = tools("binary-sensor", "en");
    expect(getBinarySensorStateText(en, undefined, "motion", false)).toBe("Clear");
    expect(getBinarySensorStateText(en, undefined, "plug", true)).toBe("Plugged in");
  });

  test("the sensors sheet writes a sensor's day and time the German way", () => {
    useSystemTime(new Date("2026-11-25T12:00:00"));
    const door = {
      id: "binary_sensor.door",
      domain: "binary_sensor",
      state: "on",
      platform: "template",
      deviceClass: "door",
      friendlyName: "Door",
      attributes: {},
      lastChanged: new Date("2026-11-20T15:04:00"),
    } as unknown as EntityView;
    const de = tools("binary-sensor", "de");
    expect(sensorLine(de, door, new Date("2026-11-25T12:00:00"))).toBe(
      `${word("binary-sensor", "de", "binary-sensor.state.open")} · 20. Nov. · 15:04`,
    );
    const view = render(() => (
      <WidgetLanguage {...language("binary-sensor", "de")}>
        <BinarySensorSheet entities={[door]} />
      </WidgetLanguage>
    ));
    expect(view.getByText(word("binary-sensor", "de", "binary-sensor.sheet.sensors"))).toBeTruthy();
  });
});

describe("camera", () => {
  function fakePlayer(status: "live" | "no-signal"): CameraPlayer {
    const [current] = createSignal(status);
    return {
      status: current,
      activeKind: () => "webrtc",
      hasAudio: () => false,
      nonce: () => 0,
      video: () => null,
      // test-change-ok retry is the player double's method, not a test retry
      retry: () => {},
      dispose: () => {},
    };
  }

  const show = (tag: "en" | "de", status: "live" | "no-signal") => {
    const [muted, setMuted] = createSignal(true);
    return render(() => (
      <WidgetLanguage {...language("camera", tag)}>
        <CameraView
          player={fakePlayer(status)}
          poster={() => undefined}
          name={() => "Front Door"}
          active={() => true}
          muted={muted}
          setMuted={setMuted}
        />
      </WidgetLanguage>
    ));
  };

  test("the camera badge and retry hint read German from the catalog", () => {
    expect(show("de", "live").getByText(word("camera", "de", "camera.status.live"))).toBeTruthy();
    const lost = show("de", "no-signal");
    expect(lost.getByText(word("camera", "de", "camera.overlay.retry"))).toBeTruthy();
  });

  test("the camera reads English with no catalog", () => {
    expect(show("en", "live").getByText("Live")).toBeTruthy();
    expect(show("en", "no-signal").getByText("No signal · tap to retry")).toBeTruthy();
  });
});

describe("picture frame", () => {
  const input = {
    pictures: [],
    samples: ["a", "b"],
    fit: "cover" as const,
    interval: "30s" as const,
    failed: new Set<string>(),
  };

  const lost = (count: number) => ({
    ...input,
    pictures: Array.from({ length: count }, (_, i) => ({ src: `p${i}` })),
    failed: new Set(Array.from({ length: count }, (_, i) => `p${i}`)),
  });

  test("the picture frame reads its sample note in French from its catalog", () => {
    const fr = tools("picture-frame", "fr");
    expect(resolveSlideshow(fr.t, input).note).toEqual({
      label: word("picture-frame", "fr", "picture-frame.note.samples"),
      hint: word("picture-frame", "fr", "picture-frame.note.add"),
    });
    const gone = resolveSlideshow(fr.t, lost(2)).note;
    expect(gone).toEqual({
      label: fr.t("picture-frame.note.gone", { count: 2 }),
      hint: word("picture-frame", "fr", "picture-frame.note.pick"),
    });
  });

  test("the picture frame reads English with no catalog", () => {
    const en = tools("picture-frame", "en");
    expect(resolveSlideshow(en.t, lost(1)).note?.label).toBe("Your picture is gone");
    expect(resolveSlideshow(en.t, lost(2)).note?.label).toBe("Your pictures are gone");
  });
});
