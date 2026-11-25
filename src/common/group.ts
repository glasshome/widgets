import type { TranslationTools } from "@glasshome/widget-sdk";

export interface GroupKeys {
  all: string;
  none: string;
  some: string;
}

/** A group's small line: "All locked" when every member agrees, "1 of 2 unlocked" otherwise. */
export function groupLine(
  tools: Pick<TranslationTools, "t">,
  active: number,
  total: number,
  keys: GroupKeys,
): string {
  if (active === 0) return tools.t(keys.none);
  if (active === total) return tools.t(keys.all);
  return tools.t(keys.some, { active, total });
}

const NO_BULK_COVER_CLASSES = new Set(["door", "gate", "garage"]);

/** Doors, gates and garage doors never move in a one-tap bulk action; a cover without a class may be one. */
export function coverJoinsBulk(entity: { deviceClass?: string | null }): boolean {
  return !!entity.deviceClass && !NO_BULK_COVER_CLASSES.has(entity.deviceClass);
}
