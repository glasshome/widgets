import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupOnLine } from "../common/group-on";
import { aggregateWord } from "../common/state-word";

const STATE_WORDS = { on: "switch.state.on", off: "switch.state.off" };

export function switchLines(
  tools: TranslationTools,
  input: { sample: StateEntity | undefined; isOn: boolean; count: number; activeCount: number },
): { hero: string; eyebrow: string } {
  return {
    hero: aggregateWord(tools, "switch", input.sample, input.isOn ? "on" : "off", STATE_WORDS),
    eyebrow:
      input.count > 1 ? groupOnLine(tools, input.activeCount, input.count) : tools.t("switch.name"),
  };
}
