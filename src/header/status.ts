export interface ChipSpec {
  key: "lights" | "locks";
  domain: "light" | "lock";
  activeState: string;
  icon: string;
  tone: string;
  stateWord: string;
  actionLabel: string;
  service: { domain: string; name: string };
}

export const CHIPS: Record<"lights" | "locks", ChipSpec> = {
  lights: {
    key: "lights",
    domain: "light",
    activeState: "on",
    icon: "mdi:lightbulb-on",
    tone: "text-warning",
    stateWord: "on",
    actionLabel: "Turn off lights",
    service: { domain: "light", name: "turn_off" },
  },
  locks: {
    key: "locks",
    domain: "lock",
    activeState: "unlocked",
    icon: "lucide:unlock",
    tone: "text-destructive/80",
    stateWord: "unlocked",
    actionLabel: "Lock doors",
    service: { domain: "lock", name: "lock" },
  },
};

export function activeIds(chip: ChipSpec, entities: { id: string; state: string }[]): string[] {
  return entities
    .filter((e) => e.id.startsWith(`${chip.domain}.`) && e.state === chip.activeState)
    .map((e) => e.id);
}

export function needsArea(config: { scope: string; areaId?: string }): boolean {
  return config.scope === "area" && !config.areaId;
}
