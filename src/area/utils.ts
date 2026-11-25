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
  temperatureUnit: "°C" | "°F";
  humidity: number | null;
  co2: number | null;
  pm25: number | null;
  hasPresence: boolean;
  hasMotion: boolean;
  alertCount: number;
}

interface CoverKind {
  /** A plural message: `{count}` picks the singular or the plural name. */
  key: string;
  open: string;
  closed: string;
}

const DOOR: CoverKind = {
  key: "area.kind.door",
  open: "mdi:door-open",
  closed: "mdi:door-closed",
};

// Doors move people and cars through the house, so they never share a one-tap bulk action with blinds.
const DOOR_KINDS: Record<string, CoverKind> = {
  garage: { key: "area.kind.garage-door", open: "mdi:garage-open", closed: "mdi:garage" },
  gate: { key: "area.kind.gate", open: "mdi:gate-open", closed: "mdi:gate" },
  door: DOOR,
};

const BLINDS: CoverKind = {
  key: "area.kind.blind",
  open: "mdi:blinds-horizontal",
  closed: "mdi:blinds-horizontal-closed",
};
const COVERING_KINDS: Record<string, CoverKind> = {
  blind: BLINDS,
  shade: { key: "area.kind.shade", open: "mdi:roller-shade", closed: "mdi:roller-shade-closed" },
  curtain: { key: "area.kind.curtain", open: "mdi:curtains", closed: "mdi:curtains-closed" },
  shutter: {
    key: "area.kind.shutter",
    open: "mdi:window-shutter-open",
    closed: "mdi:window-shutter",
  },
  awning: { key: "area.kind.awning", open: "mdi:awning-outline", closed: "mdi:awning-outline" },
  window: { key: "area.kind.window", open: "mdi:window-open", closed: "mdi:window-closed" },
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
export const doorKind = (doors: EntityView[]) => sharedKind(doors, DOOR_KINDS, DOOR);

export const HIDEABLE_DOMAINS = [
  "light",
  "switch",
  "cover",
  "climate",
  "sensor",
  "binary_sensor",
] as const;

export interface AreaExclusions {
  domains: (typeof HIDEABLE_DOMAINS)[number][];
  lights: string[];
  switches: string[];
  covers: string[];
  climate: string[];
  sensors: string[];
  binarySensors: string[];
}

export const NO_EXCLUSIONS: AreaExclusions = {
  domains: [],
  lights: [],
  switches: [],
  covers: [],
  climate: [],
  sensors: [],
  binarySensors: [],
};

export function excludeEntities<E extends { id: string; domain: string }>(
  entities: E[],
  exclude: Partial<AreaExclusions> | undefined,
): E[] {
  const all = { ...NO_EXCLUSIONS, ...exclude };
  const hiddenDomains = new Set<string>(all.domains);
  const hiddenIds = new Set([
    ...all.lights,
    ...all.switches,
    ...all.covers,
    ...all.climate,
    ...all.sensors,
    ...all.binarySensors,
  ]);
  return entities.filter((e) => !hiddenDomains.has(e.domain) && !hiddenIds.has(e.id));
}

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
  const temperatureUnit = tempEntity?.unitOfMeasurement === "°F" ? "°F" : "°C";
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
    temperatureUnit,
    humidity,
    co2,
    pm25,
    hasPresence,
    hasMotion,
    alertCount,
  };
}
