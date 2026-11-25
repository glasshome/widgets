import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupLine } from "../common/group";
import { aggregateWord } from "../common/state-word";
import type { CoverMovement } from "./cover-entity";

const GROUP_OPEN = {
  all: "common.group.all-open",
  none: "common.group.all-closed",
  some: "common.group.some-open",
};

const STATE_WORDS = {
  open: "cover.state.open",
  closed: "cover.state.closed",
  opening: "cover.state.opening",
  closing: "cover.state.closing",
};

export function coverLines(
  tools: TranslationTools,
  input: {
    sample: StateEntity | undefined;
    sliding: number | null;
    position: number | null;
    isOpen: boolean;
    movement: CoverMovement | null;
    count: number;
    openCount: number;
  },
): { hero: string | number; eyebrow: string | undefined } {
  const word = (state: string) => aggregateWord(tools, "cover", input.sample, state, STATE_WORDS);
  const hero = (): string | number => {
    if (input.sliding !== null) return input.sliding;
    const pos = input.count === 1 ? input.position : null;
    if (pos !== null && pos > 0 && pos < 100) return pos;
    return word(input.isOpen ? "open" : "closed");
  };
  const shown = hero();
  const eyebrow = (): string | undefined => {
    if (input.movement) return word(input.movement);
    if (input.count > 1) return groupLine(tools, input.openCount, input.count, GROUP_OPEN);
    return typeof shown === "number" ? word("open") : undefined;
  };
  return { hero: shown, eyebrow: eyebrow() };
}
