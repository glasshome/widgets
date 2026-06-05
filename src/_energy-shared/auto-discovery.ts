import type { EnergyPreferences } from "@glasshome/sync-layer";

export interface DiscoveredEnergyEntities {
  solar?: string;
  gridImport?: string;
  gridExport?: string;
  batteryCharge?: string;
  batteryDischarge?: string;
  consumers: Array<{ statId: string; name?: string }>;
}

export function mapEnergyPreferences(prefs: EnergyPreferences | null): DiscoveredEnergyEntities {
  const result: DiscoveredEnergyEntities = { consumers: [] };
  if (!prefs) return result;

  for (const source of prefs.energy_sources) {
    switch (source.type) {
      case "grid":
        result.gridImport = source.flow_from?.[0]?.stat_energy_from ?? result.gridImport;
        result.gridExport = source.flow_to?.[0]?.stat_energy_to ?? result.gridExport;
        break;
      case "solar":
        result.solar = source.stat_energy_from ?? result.solar;
        break;
      case "battery":
        result.batteryDischarge = source.stat_energy_from ?? result.batteryDischarge;
        result.batteryCharge = source.stat_energy_to ?? result.batteryCharge;
        break;
    }
  }

  result.consumers = prefs.device_consumption.map((device) => ({
    statId: device.stat_consumption,
    name: device.name,
  }));

  return result;
}
