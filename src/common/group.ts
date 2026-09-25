/** A group's small line: "All locked" when every member agrees, "1 of 2 unlocked" otherwise. */
export function groupLine(
  active: number,
  total: number,
  words: { active: string; rest: string },
): string {
  if (active === 0) return `All ${words.rest}`;
  if (active === total) return `All ${words.active}`;
  return `${active} of ${total} ${words.active}`;
}

const NO_BULK_COVER_CLASSES = new Set(["door", "gate", "garage"]);

/** Doors, gates and garage doors never move in a one-tap bulk action; a cover without a class may be one. */
export function coverJoinsBulk(entity: { deviceClass?: string | null }): boolean {
  return !!entity.deviceClass && !NO_BULK_COVER_CLASSES.has(entity.deviceClass);
}
