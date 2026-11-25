import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";
import { stateWord } from "../common/state-word";
import { capitalised } from "../common/text";

const STATE_WORDS = {
  playing: "media-player.state.playing",
  paused: "media-player.state.paused",
  idle: "media-player.state.idle",
  off: "media-player.state.off",
  on: "media-player.state.on",
  standby: "media-player.state.standby",
  buffering: "media-player.state.buffering",
};

export function mediaStateWord(
  tools: Pick<TranslationTools, "t" | "translateState">,
  entity: StateEntity,
): string {
  const word = stateWord(tools, entity, STATE_WORDS);
  return word === entity.state ? capitalised(word) : word;
}

export function mediaEyebrow(
  tools: Pick<TranslationTools, "t" | "translateState">,
  entity: StateEntity,
  artist: string,
): string | undefined {
  const label = entity.state === "playing" ? undefined : mediaStateWord(tools, entity);
  return [artist || undefined, label].filter(Boolean).join(" · ") || undefined;
}

export const volumeText = (tools: Pick<TranslationTools, "formatNumber">, percent: number) =>
  tools.formatNumber(percent / 100, { style: "percent" });
