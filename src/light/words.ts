import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupLine } from "../common/group";
import { aggregateWord } from "../common/state-word";

const GROUP_ON = {
  all: "common.group.all-on",
  none: "common.group.all-off",
  some: "common.group.some-on",
};

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
      input.count > 1
        ? groupLine(tools, input.activeCount, input.count, GROUP_ON)
        : tools.t("light.name"),
  };
}
