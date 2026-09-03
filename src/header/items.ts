export interface EntitySnapshot {
  id: string;
  state: string;
  name?: string;
  unit?: string;
  icon?: string;
}

export interface DomainSpec {
  /** State that means "asking for attention". */
  activeState: string;
  /** Word after the count, so a chip reads "3 on". */
  word: string;
  icon: string;
  tone: string;
  actionLabel: string;
  service: { domain: string; name: string };
}

export const DOMAIN_SPECS: Record<string, DomainSpec> = {
  light: {
    activeState: "on",
    word: "on",
    icon: "mdi:lightbulb-on",
    tone: "text-warning",
    actionLabel: "Turn off lights",
    service: { domain: "light", name: "turn_off" },
  },
  lock: {
    activeState: "unlocked",
    word: "unlocked",
    icon: "lucide:unlock",
    tone: "text-destructive/80",
    actionLabel: "Lock doors",
    service: { domain: "lock", name: "lock" },
  },
  cover: {
    activeState: "open",
    word: "open",
    icon: "mdi:window-shutter-open",
    tone: "text-primary",
    actionLabel: "Close covers",
    service: { domain: "cover", name: "close_cover" },
  },
  switch: {
    activeState: "on",
    word: "on",
    icon: "mdi:power-plug",
    tone: "text-primary",
    actionLabel: "Turn off switches",
    service: { domain: "switch", name: "turn_off" },
  },
  fan: {
    activeState: "on",
    word: "on",
    icon: "mdi:fan",
    tone: "text-primary",
    actionLabel: "Turn off fans",
    service: { domain: "fan", name: "turn_off" },
  },
};

export type ItemConfig =
  | { kind: "status"; domain: string; scope?: string; areaId?: string }
  | { kind: "entity"; entityId: string[]; label?: string; icon?: string }
  | { kind: "action"; entityId: string[]; label?: string; icon?: string }
  | { kind: "clock" };

export interface ResolvedItem {
  kind: ItemConfig["kind"];
  label: string;
  icon: string;
  tone?: string;
  value?: string;
  word?: string;
  ids: string[];
  service?: { domain: string; name: string };
}

const ACTION_SERVICE: Record<string, string> = {
  scene: "turn_on",
  script: "turn_on",
  button: "press",
  automation: "trigger",
  input_button: "press",
};

function domainOf(entityId: string): string {
  return entityId.split(".")[0] ?? "";
}

/** One configured item against the entities in its scope, or null when it has
 *  nothing to say (a quiet domain, a missing entity). */
export function resolveItem(item: ItemConfig, entities: EntitySnapshot[]): ResolvedItem | null {
  if (item.kind === "clock") {
    return { kind: "clock", label: "Time", icon: "mdi:clock-outline", ids: [] };
  }

  if (item.kind === "status") {
    const spec = DOMAIN_SPECS[item.domain];
    if (!spec) return null;
    const ids = entities
      .filter((e) => domainOf(e.id) === item.domain && e.state === spec.activeState)
      .map((e) => e.id);
    if (ids.length === 0) return null;
    return {
      kind: "status",
      label: spec.actionLabel,
      icon: spec.icon,
      tone: spec.tone,
      value: String(ids.length),
      word: spec.word,
      ids,
      service: spec.service,
    };
  }

  const id = item.entityId[0];
  if (!id) return null;

  if (item.kind === "action") {
    const service = ACTION_SERVICE[domainOf(id)];
    if (!service) return null;
    return {
      kind: "action",
      label: item.label || id,
      icon: item.icon || "mdi:play",
      ids: [id],
      service: { domain: domainOf(id), name: service },
    };
  }

  const entity = entities.find((e) => e.id === id);
  if (!entity) return null;
  return {
    kind: "entity",
    label: item.label || entity.name || id,
    icon: item.icon || entity.icon || "mdi:gauge",
    value: entity.unit ? `${entity.state} ${entity.unit}` : entity.state,
    ids: [id],
  };
}

/** Identity and the band own the left; each item needs about this much room. */
const IDENTITY_WIDTH = 260;
const ITEM_WIDTH = 130;

/** How many items fit, dropping from the end. Width 0 means unmeasured. */
export function visibleCount(width: number, total: number): number {
  if (width === 0) return total;
  const room = Math.floor((width - IDENTITY_WIDTH) / ITEM_WIDTH);
  return Math.max(0, Math.min(total, room));
}
