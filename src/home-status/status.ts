export interface ChipSpec {
  key: "lights" | "locks";
  domain: "light" | "lock";
  activeState: string;
  icon: string;
  actionLabel: string;
  service: { domain: string; name: string };
}

export const CHIPS: Record<"lights" | "locks", ChipSpec> = {
  lights: {
    key: "lights",
    domain: "light",
    activeState: "on",
    icon: "mdi:lightbulb-on",
    actionLabel: "Turn off lights",
    service: { domain: "light", name: "turn_off" },
  },
  locks: {
    key: "locks",
    domain: "lock",
    activeState: "unlocked",
    icon: "lucide:unlock",
    actionLabel: "Lock doors",
    service: { domain: "lock", name: "lock" },
  },
};

export function activeIds(chip: ChipSpec, entities: { id: string; state: string }[]): string[] {
  return entities
    .filter((e) => e.id.startsWith(`${chip.domain}.`) && e.state === chip.activeState)
    .map((e) => e.id);
}
