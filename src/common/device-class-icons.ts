/**
 * Iconify icon mappings for HA device classes.
 * Used by binary sensor, sensor, cover, and other entity-type widgets.
 */

const BINARY_SENSOR_ICONS: Record<string, [string, string]> = {
  // [on_icon, off_icon]
  motion: ["mdi:motion-sensor", "mdi:motion-sensor-off"],
  door: ["mdi:door-open", "mdi:door-closed"],
  window: ["mdi:window-open", "mdi:window-closed"],
  occupancy: ["mdi:home-account", "mdi:home-outline"],
  smoke: ["mdi:smoke-detector-alert", "mdi:smoke-detector"],
  moisture: ["mdi:water-alert", "mdi:water-off"],
  gas: ["mdi:gas-cylinder", "mdi:gas-cylinder"],
  vibration: ["mdi:vibrate", "mdi:vibrate-off"],
  connectivity: ["mdi:check-network-outline", "mdi:close-network-outline"],
  battery: ["mdi:battery-alert", "mdi:battery"],
  plug: ["mdi:power-plug", "mdi:power-plug-off"],
  presence: ["mdi:home", "mdi:home-outline"],
  running: ["mdi:play", "mdi:stop"],
  safety: ["mdi:shield-alert", "mdi:shield-check"],
  sound: ["mdi:volume-high", "mdi:volume-off"],
  heat: ["mdi:fire", "mdi:fire-off"],
  cold: ["mdi:snowflake-alert", "mdi:snowflake"],
  light: ["mdi:brightness-7", "mdi:brightness-5"],
  lock: ["mdi:lock-open", "mdi:lock"],
  opening: ["mdi:square-outline", "mdi:square"],
  problem: ["mdi:alert-circle", "mdi:check-circle"],
  tamper: ["mdi:alert", "mdi:check"],
  update: ["mdi:package-up", "mdi:package"],
};

export function getBinarySensorIcon(deviceClass: string | null, isOn: boolean): string {
  const icons = BINARY_SENSOR_ICONS[deviceClass ?? ""];
  if (icons) return isOn ? icons[0] : icons[1];
  return isOn ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline";
}

const SENSOR_ICONS: Record<string, string> = {
  temperature: "mdi:thermometer",
  humidity: "mdi:water-percent",
  pressure: "mdi:gauge",
  power: "mdi:flash",
  energy: "mdi:lightning-bolt",
  voltage: "mdi:sine-wave",
  current: "mdi:current-ac",
  battery: "mdi:battery",
  illuminance: "mdi:brightness-5",
  signal_strength: "mdi:wifi",
  carbon_dioxide: "mdi:molecule-co2",
  carbon_monoxide: "mdi:molecule-co",
  pm25: "mdi:air-filter",
  pm10: "mdi:air-filter",
  timestamp: "mdi:clock",
  duration: "mdi:timer",
  distance: "mdi:ruler",
  speed: "mdi:speedometer",
  weight: "mdi:scale",
  monetary: "mdi:cash",
  gas: "mdi:gas-cylinder",
  water: "mdi:water",
};

export function getSensorIcon(deviceClass: string | null): string {
  return SENSOR_ICONS[deviceClass ?? ""] ?? "mdi:eye";
}

const COVER_ICONS: Record<string, [string, string]> = {
  // [open_icon, closed_icon]
  blind: ["mdi:blinds-open", "mdi:blinds"],
  curtain: ["mdi:curtains-open", "mdi:curtains"],
  garage: ["mdi:garage-open", "mdi:garage"],
  gate: ["mdi:gate-open", "mdi:gate"],
  shutter: ["mdi:window-shutter-open", "mdi:window-shutter"],
  awning: ["mdi:awning-outline", "mdi:awning"],
  shade: ["mdi:roller-shade", "mdi:roller-shade-closed"],
  door: ["mdi:door-open", "mdi:door-closed"],
  window: ["mdi:window-open", "mdi:window-closed"],
};

export function getCoverIcon(position: number | null, deviceClass: string | null): string {
  const isOpen = position !== null ? position > 0 : true;
  const icons = COVER_ICONS[deviceClass ?? ""];
  if (icons) return isOpen ? icons[0] : icons[1];
  return isOpen ? "mdi:window-open" : "mdi:window-closed";
}
