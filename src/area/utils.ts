import type { AreaView, EntityView } from "@glasshome/widget-sdk";

export interface EntityGroups {
  lights: EntityView[];
  switches: EntityView[];
  covers: EntityView[];
  climate: EntityView[];
  sensors: EntityView[];
  binarySensors: EntityView[];
}

export interface AreaMetrics {
  lightsOn: number;
  lightsTotal: number;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  pm25: number | null;
  hasPresence: boolean;
  hasMotion: boolean;
  alertCount: number;
}

export function groupEntitiesByDomain(entities: EntityView[]): EntityGroups {
  const groups: EntityGroups = {
    lights: [],
    switches: [],
    covers: [],
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
        groups.covers.push(entity);
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
    temperature,
    humidity,
    co2,
    pm25,
    hasPresence,
    hasMotion,
    alertCount,
  };
}
