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
import { catalogsOf, language } from "../catalog";

const word = (dir: string, tag: string, key: string): string => {
  const parts = catalogsOf(dir)[tag]?.[key];
  if (parts?.length !== 1 || typeof parts[0] !== "string") throw new Error(`${dir} ${tag} ${key}`);
  return parts[0];
};

const tools = (dir: string, tag: "en" | "fr" | "de") => languageTools(language(dir, tag));

const lamp = {
  id: "light.desk",
  domain: "light",
  state: "on",
  platform: "hue",
  deviceClass: null,
  attributes: {},
} as unknown as EntityView;

describe("button", () => {
  test("button reads French from its catalog", () => {
    const lines = buttonLines(tools("button", "fr"), "2026-11-25T15:04:00");
    expect(lines.sub).toBe(word("button", "fr", "button.hero.last-pressed"));
    expect(buttonLines(tools("button", "fr"), undefined).sub).toBe(
      word("button", "fr", "button.hero.never"),
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
  const states = ["2026-11-25T15:04:00Z"];

  test("scene reads French from its catalog", () => {
    useSystemTime(new Date("2026-11-25T18:00:00Z"));
    const line = sceneEyebrow(tools("scene", "fr"), { states, name: "Soirée" });
    expect(line).toContain("15:04");
    expect(line).not.toBe("Ran at 3:04 PM");
    expect(sceneEyebrow(tools("scene", "fr"), { states: ["unknown"], name: "Soirée" })).toBe(
      word("scene", "fr", "scene.name.one"),
    );
  });

  test("scene reads English with no catalog", () => {
    useSystemTime(new Date("2026-11-25T18:00:00Z"));
    expect(sceneEyebrow(tools("scene", "en"), { states, name: "Evening" })).toMatch(
      /^Ran at 3:04\sPM$/,
    );
    expect(
      sceneEyebrow(tools("scene", "en"), { states: ["unknown", "unknown"], name: "Evening" }),
    ).toBe("2 scenes");
  });
});

describe("switch", () => {
  const input = { sample: lamp, isOn: true, count: 2, activeCount: 2 };

  test("switch reads French from its catalog", () => {
    const lines = switchLines(tools("switch", "fr"), input);
    expect(lines.hero).toBe(word("switch", "fr", "switch.state.on"));
    expect(lines.eyebrow).toBe(word("switch", "fr", "common.group.all-on"));
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
  const entities = [
    { id: "lock.front", state: "locked", friendlyName: "Front", lastChanged: new Date(0) },
  ] as unknown as EntityView[];

  test("lock reads French from its catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("lock", "fr")}>
        <LockSheet entities={entities} />
      </WidgetLanguage>
    ));
    expect(view.getByText(word("lock", "fr", "lock.sheet.last-changed"))).toBeTruthy();
    expect(view.getByText(word("lock", "fr", "lock.sheet.doors"))).toBeTruthy();
    const hero = lockLines(tools("lock", "fr"), {
      sample: lamp,
      isLocked: true,
      count: 1,
      lockedCount: 1,
    }).hero;
    expect(hero).toBe(word("lock", "fr", "lock.state.locked"));
  });

  test("lock reads English with no catalog", () => {
    const view = render(() => (
      <WidgetLanguage {...language("lock", "en")}>
        <LockSheet entities={entities} />
      </WidgetLanguage>
    ));
    expect(view.getByText("Last changed")).toBeTruthy();
    expect(view.getByText("Doors")).toBeTruthy();
  });
});

describe("fan", () => {
  const input = {
    sample: lamp,
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
    expect(lines.hero).toBe(word("fan", "fr", "fan.state.off"));
    expect(lines.eyebrow).toBe(word("fan", "fr", "fan.name"));
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
  const input = { sample: lamp, isOn: false, brightness: 40, count: 3, activeCount: 1 };

  test("light reads French from its catalog", () => {
    const lines = lightLines(tools("light", "fr"), input);
    expect(lines.hero).toBe(word("light", "fr", "light.state.off"));
    expect(lines.eyebrow).toContain("1");
    expect(lines.eyebrow).not.toBe("1 of 3 on");
  });

  test("light reads English with no catalog", () => {
    const lines = lightLines(tools("light", "en"), input);
    expect(lines.hero).toBe("Off");
    expect(lines.eyebrow).toBe("1 of 3 on");
    expect(lightLines(tools("light", "en"), { ...input, isOn: true }).hero).toBe(40);
  });
});

describe("cover", () => {
  const input = {
    sample: lamp,
    sliding: null,
    position: null,
    isOpen: false,
    movement: "opening" as const,
    count: 1,
    openCount: 0,
  };

  test("cover reads French from its catalog", () => {
    const lines = coverLines(tools("cover", "fr"), input);
    expect(lines.eyebrow).toBe(word("cover", "fr", "cover.state.opening"));
    expect(lines.hero).toBe(word("cover", "fr", "cover.state.closed"));
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
