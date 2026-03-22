import type { EntityView } from "@glasshome/sync-layer";

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

export function calculateMetrics(groups: EntityGroups): AreaMetrics {
  const lightsOn = groups.lights.filter((e) => e.state === "on").length;
  const lightsTotal = groups.lights.length;

  let temperature: number | null = null;
  for (const sensor of groups.sensors) {
    if (sensor.deviceClass === "temperature") {
      const val = Number.parseFloat(sensor.state);
      if (Number.isFinite(val)) {
        temperature = val;
        break;
      }
    }
  }

  let humidity: number | null = null;
  for (const sensor of groups.sensors) {
    if (sensor.deviceClass === "humidity") {
      const val = Number.parseFloat(sensor.state);
      if (Number.isFinite(val)) {
        humidity = val;
        break;
      }
    }
  }

  const alertCount = groups.binarySensors.filter((e) => e.state === "on").length;

  return { lightsOn, lightsTotal, temperature, humidity, alertCount };
}

export function getAreaIcon(metrics: AreaMetrics): string {
  if (metrics.lightsTotal > 0) return "mdi:lightbulb-group";
  if (metrics.temperature !== null) return "mdi:thermostat";
  return "mdi:home-floor-1";
}
