import { render } from "@solidjs/testing-library";
import type { EntityView } from "@glasshome/widget-sdk";
import { languageTools } from "@glasshome/widget-sdk/testing/tools";
import { WidgetLanguage } from "@glasshome/widget-sdk/testing";
import { useFakeTime, useSystemTime } from "@glasshome/ui/testing";
import { describe, expect, test } from "vitest";
import { buttonLines } from "../../src/button/words";
import { coverLines } from "../../src/cover/words";
import { fanLines } from "../../src/fan/words";
import { lightLines } from "../../src/light/words";
import { LockSheet } from "../../src/lock/sheet";
import { lockLines } from "../../src/lock/words";
import { sceneEyebrow } from "../../src/scene/words";
import { switchLines } from "../../src/switch/words";
import { language } from "../catalog";

const tools = (dir: string, tag: "en" | "fr" | "de") => languageTools(language(dir, tag));
const fr = (dir: string, key: string, params?: Record<string, string | number>) =>
  tools(dir, "fr").t(key, params);

const sample = (domain: string, state: string) =>
  ({ domain, state, platform: "template", deviceClass: null, attributes: {} }) as EntityView;

const frDate = (value: Date, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr", options).format(value);

describe("button", () => {
  test("button reads French from its catalog", () => {
    const lines = buttonLines(tools("button", "fr"), "2026-11-25T15:04:00");
    expect(lines.sub).toBe(fr("button", "button.hero.last-pressed"));
    expect(lines.value).toBe("15:04");
    expect(buttonLines(tools("button", "fr"), undefined).sub).toBe(
      fr("button", "button.hero.never"),
    );
  });

  test("button reads English with no catalog", () => {
    const lines = buttonLines(tools("button", "en"), "2026-11-25T15:04:00");
    expect(lines.sub).toBe("Last pressed");
    expect(lines.value).toMatch(/^3:04\sPM$/);
    expect(buttonLines(tools("button", "en"), "unknown").sub).toBe("Never pressed");
  });

  test("button writes its time the German way", () => {
    useFakeTime();
    expect(buttonLines(tools("button", "de"), "2026-11-25T15:04:00").value).toBe("15:04");
  });
});

describe("scene", () => {
  const stamp = "2026-11-25T15:04:00Z";

  test("scene reads French from its catalog", () => {
    useSystemTime(new Date("2026-11-25T18:00:00Z"));
    expect(sceneEyebrow(tools("scene", "fr"), { states: [stamp], name: "Soirée" })).toBe(
      fr("scene", "scene.eyebrow.ran-at", { time: "15:04" }),
    );
    expect(sceneEyebrow(tools("scene", "fr"), { states: ["unknown"], name: "Soirée" })).toBe(
      fr("scene", "scene.name.one"),
    );
    expect(
      sceneEyebrow(tools("scene", "fr"), { states: ["unknown", "unknown"], name: "Soirée" }),
    ).toBe(fr("scene", "scene.eyebrow.count", { count: 2 }));
  });

  test("scene names the weekday of an earlier run in French", () => {
    useSystemTime(new Date("2026-11-27T18:00:00Z"));
    expect(sceneEyebrow(tools("scene", "fr"), { states: [stamp], name: "Soirée" })).toBe(
      fr("scene", "scene.eyebrow.ran-on", {
        day: frDate(new Date(stamp), { weekday: "short" }),
        time: "15:04",
      }),
    );
  });

  test("scene reads English with no catalog", () => {
    useSystemTime(new Date("2026-11-25T18:00:00Z"));
    expect(sceneEyebrow(tools("scene", "en"), { states: [stamp], name: "Evening" })).toMatch(
      /^Ran at 3:04\sPM$/,
    );
    expect(
      sceneEyebrow(tools("scene", "en"), { states: ["unknown", "unknown"], name: "Evening" }),
    ).toBe("2 scenes");
    useSystemTime(new Date("2026-11-27T18:00:00Z"));
    expect(sceneEyebrow(tools("scene", "en"), { states: [stamp], name: "Evening" })).toMatch(
      /^Ran Wed 3:04\sPM$/,
    );
  });
});

describe("switch", () => {
  const input = { sample: sample("switch", "on"), isOn: true, count: 2, activeCount: 2 };

  test("switch reads French from its catalog", () => {
    const lines = switchLines(tools("switch", "fr"), input);
    expect(lines.hero).toBe(fr("switch", "switch.state.on"));
    expect(lines.eyebrow).toBe(fr("switch", "common.group.all-on"));
    expect(switchLines(tools("switch", "fr"), { ...input, count: 1 }).eyebrow).toBe(
      fr("switch", "switch.name"),
    );
  });

  test("switch reads English with no catalog", () => {
    const lines = switchLines(tools("switch", "en"), input);
    expect(lines.hero).toBe("On");
    expect(lines.eyebrow).toBe("All on");
    expect(switchLines(tools("switch", "en"), { ...input, isOn: false, count: 1 }).eyebrow).toBe(
      "Switch",
    );
  });
});

describe("lock", () => {
  const today = new Date("2026-11-25T09:05:00Z");
  const earlier = new Date("2026-11-20T09:05:00Z");
  const entities = (lastChanged: Date) =>
    [
      { id: "lock.front", state: "locked", friendlyName: "Front", lastChanged },
    ] as unknown as EntityView[];
  const sheet = (tag: "en" | "fr", lastChanged: Date) =>
    render(() => (
      <WidgetLanguage {...language("lock", tag)}>
        <LockSheet entities={entities(lastChanged)} />
      </WidgetLanguage>
    ));

  test("lock reads French from its catalog", () => {
    useSystemTime(today);
    const view = sheet("fr", today);
    expect(view.getByText(fr("lock", "lock.sheet.last-changed"))).toBeTruthy();
    expect(view.getByText(fr("lock", "lock.sheet.doors"))).toBeTruthy();
    expect(view.getByText("09:05")).toBeTruthy();
    const hero = lockLines(tools("lock", "fr"), {
      sample: sample("lock", "locked"),
      isLocked: true,
      count: 1,
      lockedCount: 1,
    }).hero;
    expect(hero).toBe(fr("lock", "lock.state.locked"));
  });

  test("lock dates an earlier change in French", () => {
    useSystemTime(today);
    const view = sheet("fr", earlier);
    const day = frDate(earlier, { month: "short", day: "numeric" });
    expect(
      view.getByText(fr("lock", "lock.sheet.changed-at", { day, time: "09:05" })),
    ).toBeTruthy();
  });

  test("lock reads English with no catalog", () => {
    useSystemTime(today);
    const view = sheet("en", earlier);
    expect(view.getByText("Last changed")).toBeTruthy();
    expect(view.getByText("Doors")).toBeTruthy();
    expect(view.getByText(/^Nov 20 · 09:05\sAM$/)).toBeTruthy();
  });
});

describe("fan", () => {
  const input = {
    sample: sample("fan", "off"),
    isOn: false,
    isUnavailable: false,
    supportsSpeed: true,
    percentage: 40,
    count: 1,
    activeCount: 0,
    preset: undefined,
  };

  test("fan reads French from its catalog", () => {
    const lines = fanLines(tools("fan", "fr"), input);
    expect(lines.hero).toBe(fr("fan", "fan.state.off"));
    expect(lines.eyebrow).toBe(fr("fan", "fan.name"));
    expect(fanLines(tools("fan", "fr"), { ...input, count: 2, activeCount: 1 }).eyebrow).toBe(
      fr("fan", "common.group.some-on", { active: 1, total: 2 }),
    );
  });

  test("fan reads English with no catalog", () => {
    expect(fanLines(tools("fan", "en"), input).hero).toBe("Off");
    expect(fanLines(tools("fan", "en"), { ...input, isOn: true }).hero).toBe(40);
    expect(fanLines(tools("fan", "en"), { ...input, isOn: true, preset: "auto" }).eyebrow).toBe(
      "Auto",
    );
  });
});

describe("light", () => {
  const input = {
    sample: sample("light", "off"),
    isOn: false,
    brightness: 40,
    count: 3,
    activeCount: 1,
  };

  test("light reads French from its catalog", () => {
    const lines = lightLines(tools("light", "fr"), input);
    expect(lines.hero).toBe(fr("light", "light.state.off"));
    expect(lines.eyebrow).toBe(fr("light", "common.group.some-on", { active: 1, total: 3 }));
    expect(lightLines(tools("light", "fr"), { ...input, activeCount: 3 }).eyebrow).toBe(
      fr("light", "common.group.all-on"),
    );
    expect(lightLines(tools("light", "fr"), { ...input, activeCount: 0 }).eyebrow).toBe(
      fr("light", "common.group.all-off"),
    );
  });

  test("light reads English with no catalog", () => {
    const lines = lightLines(tools("light", "en"), input);
    expect(lines.hero).toBe("Off");
    expect(lines.eyebrow).toBe("1 of 3 on");
    expect(lightLines(tools("light", "en"), { ...input, activeCount: 3 }).eyebrow).toBe("All on");
    expect(lightLines(tools("light", "en"), { ...input, isOn: true }).hero).toBe(40);
  });
});

describe("cover", () => {
  const input = {
    sample: sample("cover", "opening"),
    sliding: null,
    position: null,
    isOpen: false,
    movement: "opening" as const,
    count: 1,
    openCount: 0,
  };

  test("cover reads French from its catalog", () => {
    const lines = coverLines(tools("cover", "fr"), input);
    expect(lines.eyebrow).toBe(fr("cover", "cover.state.opening"));
    expect(lines.hero).toBe(fr("cover", "cover.state.closed"));
    expect(coverLines(tools("cover", "fr"), { ...input, movement: null, count: 2 }).eyebrow).toBe(
      fr("cover", "common.group.all-closed"),
    );
  });

  test("cover reads English with no catalog", () => {
    expect(coverLines(tools("cover", "en"), input).eyebrow).toBe("Opening");
    expect(coverLines(tools("cover", "en"), { ...input, movement: "closing" }).eyebrow).toBe(
      "Closing",
    );
    expect(coverLines(tools("cover", "en"), { ...input, movement: null, count: 2 }).eyebrow).toBe(
      "All closed",
    );
  });
});
