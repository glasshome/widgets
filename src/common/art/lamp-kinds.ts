export type LampKind =
  | "table"
  | "floor"
  | "pendant"
  | "desk"
  | "mushroom"
  | "ceiling"
  | "sconce"
  | "bulb";

export const LAMP_LABELS: Record<LampKind, string> = {
  table: "Table lamp",
  floor: "Floor lamp",
  pendant: "Pendant",
  desk: "Desk lamp",
  mushroom: "Mushroom lamp",
  ceiling: "Ceiling light",
  sconce: "Wall light",
  bulb: "Bare bulb",
};

export const LAMP_ICONS: Record<LampKind, string> = {
  table: "mdi:lamp",
  floor: "mdi:floor-lamp",
  pendant: "mdi:ceiling-light",
  desk: "mdi:desk-lamp",
  mushroom: "mdi:mushroom-outline",
  ceiling: "mdi:ceiling-light-flat",
  sconce: "mdi:wall-sconce-round",
  bulb: "mdi:lightbulb-filament",
};

export const LAMP_KINDS = Object.keys(LAMP_LABELS) as LampKind[];
