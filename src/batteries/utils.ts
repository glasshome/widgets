import type { EntityView } from "@glasshome/widget-sdk";

export interface BatteryDevice {
  entity: EntityView;
  level: number;
  isAvailable: boolean;
  isLow: boolean;
}

interface BatteriesConfig {
  title?: string;
  threshold?: number;
  whitelist?: string[];
  blacklist?: string[];
}

export function getBatteryColor(level: number): string {
  if (level < 20) return "#ef4444";
  if (level < 40) return "#f97316";
  if (level < 60) return "#eab308";
  return "#22c55e";
}

export function getBatteryIcon(level: number): string {
  if (level < 10) return "mdi:battery-alert";
  if (level <= 20) return "mdi:battery-20";
  if (level <= 40) return "mdi:battery-40";
  if (level <= 60) return "mdi:battery-60";
  if (level <= 80) return "mdi:battery-80";
  return "mdi:battery";
}

export function filterAndSortBatteries(
  entities: EntityView[],
  config: BatteriesConfig,
): BatteryDevice[] {
  const threshold = config.threshold ?? 20;

  return entities
    .filter((e) => {
      const dc = e.attributes?.device_class;
      if (dc !== "battery") return false;

      const id = e.id;
      if (config.whitelist?.length) {
        return config.whitelist.some((frag) => id.includes(frag));
      }
      if (config.blacklist?.length) {
        return !config.blacklist.some((frag) => id.includes(frag));
      }
      return true;
    })
    .map((entity) => {
      const level = Number(entity.state) || 0;
      return {
        entity,
        level,
        isAvailable: entity.state !== "unavailable" && entity.state !== "unknown",
        isLow: level < threshold,
      };
    })
    .sort((a, b) => a.level - b.level);
}
