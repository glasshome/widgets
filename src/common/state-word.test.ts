import { describe, expect, test } from "bun:test";
import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { stateWord } from "./state-word";

const FALLBACK = { open: "cover.state.open" };
const WORDS: Record<string, string> = { "cover.state.open": "Ouvert (catalogue)" };

const entity = (state: string): StateEntity => ({
  domain: "cover",
  state,
  platform: "template",
  attributes: {},
  deviceClass: "door",
});

function tools(translated: Record<string, string>): Pick<TranslationTools, "t" | "translateState"> {
  return {
    t: (key) => WORDS[key] ?? key,
    translateState: (e) =>
      (Object.hasOwn(translated, e.state) ? translated[e.state] : e.state) ?? e.state,
  };
}

describe("stateWord", () => {
  test("HA's word wins", () => {
    expect(stateWord(tools({ open: "Ouvert" }), entity("open"), FALLBACK)).toBe("Ouvert");
  });

  test("the catalog word stands in when HA has none", () => {
    expect(stateWord(tools({}), entity("open"), FALLBACK)).toBe("Ouvert (catalogue)");
  });

  test("an unknown state stays raw", () => {
    expect(stateWord(tools({}), entity("ajar"), FALLBACK)).toBe("ajar");
  });

  test("__proto__ stays raw", () => {
    expect(stateWord(tools({}), entity("__proto__"), FALLBACK)).toBe("__proto__");
  });
});
