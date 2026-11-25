import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";

export function stateWord(
  tools: Pick<TranslationTools, "t" | "translateState">,
  entity: StateEntity,
  fallback: Readonly<Record<string, string>>,
): string {
  const word = tools.translateState(entity);
  if (word !== entity.state) return word;
  return Object.hasOwn(fallback, entity.state) ? tools.t(fallback[entity.state] ?? "") : word;
}

export function aggregateWord(
  tools: Pick<TranslationTools, "t" | "translateState">,
  domain: string,
  sample: StateEntity | undefined,
  state: string,
  fallback: Readonly<Record<string, string>>,
): string {
  const entity: StateEntity = {
    domain,
    state,
    platform: sample?.platform ?? "",
    attributes: {},
    deviceClass: sample?.deviceClass ?? null,
  };
  return stateWord(tools, entity, fallback);
}
