import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupLine } from "../common/group";
import { aggregateWord } from "../common/state-word";

const GROUP_UNLOCKED = {
  all: "common.group.all-unlocked",
  none: "common.group.all-locked",
  some: "common.group.some-unlocked",
};

const STATE_WORDS = { locked: "lock.state.locked", unlocked: "lock.state.unlocked" };

export function lockLines(
  tools: TranslationTools,
  input: { sample: StateEntity | undefined; isLocked: boolean; count: number; lockedCount: number },
): { hero: string; eyebrow: string } {
  return {
    hero: aggregateWord(
      tools,
      "lock",
      input.sample,
      input.isLocked ? "locked" : "unlocked",
      STATE_WORDS,
    ),
    eyebrow:
      input.count > 1
        ? groupLine(tools, input.count - input.lockedCount, input.count, GROUP_UNLOCKED)
        : tools.t("lock.name"),
  };
}
