import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupLine } from "../common/group";
import { aggregateWord } from "../common/state-word";

const GROUP_ON = {
  all: "common.group.all-on",
  none: "common.group.all-off",
  some: "common.group.some-on",
};

const STATE_WORDS = { on: "switch.state.on", off: "switch.state.off" };

export function switchLines(
  tools: TranslationTools,
  input: { sample: StateEntity | undefined; isOn: boolean; count: number; activeCount: number },
): { hero: string; eyebrow: string } {
  return {
    hero: aggregateWord(tools, "switch", input.sample, input.isOn ? "on" : "off", STATE_WORDS),
    eyebrow:
      input.count > 1
        ? groupLine(tools, input.activeCount, input.count, GROUP_ON)
        : tools.t("switch.name"),
  };
}
