import type { AreaView, EntityView } from "@glasshome/widget-sdk";

export interface EntityGroups {
  lights: EntityView[];
  switches: EntityView[];
  covers: EntityView[];
  doors: EntityView[];
  climate: EntityView[];
  sensors: EntityView[];
  binarySensors: EntityView[];
}

export interface AreaMetrics {
  lightsOn: number;
  lightsTotal: number;
  coversOpen: number;
  coversTotal: number;
  doorsOpen: number;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  pm25: number | null;
  hasPresence: boolean;
  hasMotion: boolean;
  alertCount: number;
}

interface CoverKind {
  one: string;
  many: string;
  open: string;
  closed: string;
}

// Doors move people and cars through the house, so they never share a one-tap bulk action with blinds.
const DOOR_KINDS: Record<string, CoverKind> = {
  garage: {
    one: "Garage door",
    many: "Garage doors",
    open: "mdi:garage-open",
    closed: "mdi:garage",
  },
  gate: { one: "Gate", many: "Gates", open: "mdi:gate-open", closed: "mdi:gate" },
  door: { one: "Door", many: "Doors", open: "mdi:door-open", closed: "mdi:door-closed" },
};
const MIXED_DOORS: CoverKind = {
  one: "Door",
  many: "Doors",
  open: "mdi:door-open",
  closed: "mdi:door-closed",
};

const BLINDS: CoverKind = {
  one: "Blind",
  many: "Blinds",
  open: "mdi:blinds-horizontal",
  closed: "mdi:blinds-horizontal-closed",
};
const COVERING_KINDS: Record<string, CoverKind> = {
  blind: BLINDS,
  shade: {
    one: "Shade",
    many: "Shades",
    open: "mdi:roller-shade",
    closed: "mdi:roller-shade-closed",
  },
  curtain: {
    one: "Curtain",
    many: "Curtains",
    open: "mdi:curtains",
    closed: "mdi:curtains-closed",
  },
  shutter: {
    one: "Shutter",
    many: "Shutters",
    open: "mdi:window-shutter-open",
    closed: "mdi:window-shutter",
  },
  awning: {
    one: "Awning",
    many: "Awnings",
    open: "mdi:awning-outline",
    closed: "mdi:awning-outline",
  },
  window: { one: "Window", many: "Windows", open: "mdi:window-open", closed: "mdi:window-closed" },
};

function isDoorCover(entity: EntityView): boolean {
  return entity.deviceClass != null && entity.deviceClass in DOOR_KINDS;
}

function sharedKind(
  entities: EntityView[],
  table: Record<string, CoverKind>,
  mixed: CoverKind,
): CoverKind {
  const first = entities[0]?.deviceClass ?? "";
  const same = entities.every((e) => (e.deviceClass ?? "") === first);
  return (same ? table[first] : undefined) ?? mixed;
}

export const coverKind = (covers: EntityView[]) => sharedKind(covers, COVERING_KINDS, BLINDS);
export const doorKind = (doors: EntityView[]) => sharedKind(doors, DOOR_KINDS, MIXED_DOORS);

export function groupEntitiesByDomain(entities: EntityView[]): EntityGroups {
  const groups: EntityGroups = {
    lights: [],
    switches: [],
    covers: [],
    doors: [],
    climate: [],
    sensors: [],
    binarySensors: [],
  };

  for (const entity of entities) {
    switch (entity.domain) {
      case "light":
        groups.lights.push(entity);
        break;
      case "switch":
        groups.switches.push(entity);
        break;
      case "cover":
        (isDoorCover(entity) ? groups.doors : groups.covers).push(entity);
        break;
      case "climate":
        groups.climate.push(entity);
        break;
      case "sensor":
        groups.sensors.push(entity);
        break;
      case "binary_sensor":
        groups.binarySensors.push(entity);
        break;
    }
  }

  return groups;
}

function readNumericState(entity: EntityView | undefined): number | null {
  if (!entity) return null;
  const val = Number.parseFloat(entity.state);
  return Number.isFinite(val) ? val : null;
}

function findSensorByClass(sensors: EntityView[], deviceClass: string): EntityView | undefined {
  return sensors.find(
    (s) => s.deviceClass === deviceClass && s.state !== "unavailable" && s.state !== "unknown",
  );
}

/**
 * Calculate area metrics. Uses AreaView.temperatureEntityId / humidityEntityId
 * when available (HA-configured sensors), falling back to deviceClass scan.
 */
export function calculateMetrics(groups: EntityGroups, area?: AreaView): AreaMetrics {
  const lightsOn = groups.lights.filter((e) => e.state === "on").length;
  const lightsTotal = groups.lights.length;

  const coversTotal = groups.covers.length;
  const coversOpen = groups.covers.filter((e) => e.state === "open").length;
  const doorsOpen = groups.doors.filter((e) => e.state !== "closed").length;

  // Prefer HA-configured area sensors, fall back to deviceClass scan
  const tempEntity = area?.temperatureEntityId
    ? groups.sensors.find((s) => s.id === area.temperatureEntityId)
    : findSensorByClass(groups.sensors, "temperature");
  const humEntity = area?.humidityEntityId
    ? groups.sensors.find((s) => s.id === area.humidityEntityId)
    : findSensorByClass(groups.sensors, "humidity");

  const temperature = readNumericState(tempEntity);
  const humidity = readNumericState(humEntity);
  const co2 = readNumericState(findSensorByClass(groups.sensors, "carbon_dioxide"));
  const pm25 = readNumericState(findSensorByClass(groups.sensors, "pm25"));

  const hasPresence = groups.binarySensors.some(
    (e) => (e.deviceClass === "presence" || e.deviceClass === "occupancy") && e.state === "on",
  );
  const hasMotion = groups.binarySensors.some(
    (e) => e.deviceClass === "motion" && e.state === "on",
  );
  const alertCount = groups.binarySensors.filter(
    (e) =>
      (e.deviceClass === "smoke" ||
        e.deviceClass === "gas" ||
        e.deviceClass === "carbon_monoxide") &&
      e.state === "on",
  ).length;

  return {
    lightsOn,
    lightsTotal,
    coversOpen,
    coversTotal,
    doorsOpen,
    temperature,
    humidity,
    co2,
    pm25,
    hasPresence,
    hasMotion,
    alertCount,
  };
}
