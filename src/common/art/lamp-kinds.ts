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
  // ui-text-ok: schema label the manifest derives
  table: "Table lamp",
  // ui-text-ok: schema label the manifest derives
  floor: "Floor lamp",
  // ui-text-ok: schema label the manifest derives
  pendant: "Pendant",
  // ui-text-ok: schema label the manifest derives
  desk: "Desk lamp",
  // ui-text-ok: schema label the manifest derives
  mushroom: "Mushroom lamp",
  // ui-text-ok: schema label the manifest derives
  ceiling: "Ceiling light",
  // ui-text-ok: schema label the manifest derives
  sconce: "Wall light",
  // ui-text-ok: schema label the manifest derives
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
