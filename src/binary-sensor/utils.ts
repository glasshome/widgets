/**
 * Binary sensor state text formatting per device class.
 */

const STATE_TEXT: Record<string, [string, string]> = {
  // [on_text, off_text]
  door: ["Open", "Closed"],
  window: ["Open", "Closed"],
  garage_door: ["Open", "Closed"],
  opening: ["Open", "Closed"],
  lock: ["Unlocked", "Locked"],
  motion: ["Detected", "Clear"],
  occupancy: ["Occupied", "Clear"],
  presence: ["Home", "Away"],
  smoke: ["Detected", "Clear"],
  gas: ["Detected", "Clear"],
  moisture: ["Wet", "Dry"],
  vibration: ["Vibrating", "Still"],
  connectivity: ["Connected", "Disconnected"],
  battery: ["Low", "Normal"],
  plug: ["Plugged in", "Unplugged"],
  problem: ["Problem", "OK"],
  safety: ["Unsafe", "Safe"],
  tamper: ["Tampered", "OK"],
  sound: ["Detected", "Clear"],
  heat: ["Hot", "Normal"],
  cold: ["Cold", "Normal"],
  light: ["Light", "Dark"],
  running: ["Running", "Stopped"],
  update: ["Available", "Up to date"],
};

export function getBinarySensorStateText(deviceClass: string | null, isOn: boolean): string {
  const texts = STATE_TEXT[deviceClass ?? ""];
  if (texts) return isOn ? texts[0] : texts[1];
  return isOn ? "On" : "Off";
}
