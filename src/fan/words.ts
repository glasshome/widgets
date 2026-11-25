import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { groupOnLine } from "../common/group-on";
import { aggregateWord } from "../common/state-word";

const STATE_WORDS = { on: "fan.state.on", off: "fan.state.off" };

const capitalised = (s: string) => `${s.charAt(0).toUpperCase()}${s.slice(1)}`;

export function presetWord(
  tools: Pick<TranslationTools, "translateState">,
  entity: StateEntity | undefined,
  preset: string,
  rawWord: (preset: string) => string,
): string {
  if (!entity) return rawWord(preset);
  const word = tools.translateState(entity, { attribute: "preset_mode", value: preset });
  return word === preset ? rawWord(preset) : word;
}

export function fanLines(
  tools: TranslationTools,
  input: {
    sample: StateEntity | undefined;
    isOn: boolean;
    isUnavailable: boolean;
    supportsSpeed: boolean;
    percentage: number;
    count: number;
    activeCount: number;
    preset: string | undefined;
  },
): { hero: string | number; eyebrow: string } {
  const word = (state: string) => aggregateWord(tools, "fan", input.sample, state, STATE_WORDS);
  const hero = (): string | number => {
    if (input.isUnavailable) return "--";
    if (!input.isOn) return word("off");
    if (input.count > 1) return word("on");
    return input.supportsSpeed ? Math.round(input.percentage) : word("on");
  };
  const eyebrow = (): string => {
    if (input.isUnavailable) return word("unavailable");
    if (input.count > 1) return groupOnLine(tools, input.activeCount, input.count);
    if (input.isOn && input.preset) {
      return presetWord(tools, input.sample, input.preset, capitalised);
    }
    return tools.t("fan.name");
  };
  return { hero: hero(), eyebrow: eyebrow() };
}
