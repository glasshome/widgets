import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupOnLine } from "../common/group-on";
import { aggregateWord } from "../common/state-word";

const STATE_WORDS = { off: "light.state.off" };

export function lightLines(
  tools: TranslationTools,
  input: {
    sample: StateEntity | undefined;
    isOn: boolean;
    brightness: number;
    count: number;
    activeCount: number;
  },
): { hero: string | number; eyebrow: string } {
  return {
    hero: input.isOn
      ? Math.round(input.brightness)
      : aggregateWord(tools, "light", input.sample, "off", STATE_WORDS),
    eyebrow:
      input.count > 1 ? groupOnLine(tools, input.activeCount, input.count) : tools.t("light.name"),
  };
}
