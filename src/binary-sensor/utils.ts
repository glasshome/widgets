import type { StateEntity, TranslationTools } from "@glasshome/widget-sdk";

type Tools = Pick<TranslationTools, "t" | "translateState">;

const STATE_KEYS: Record<string, [string, string]> = {
  door: ["binary-sensor.state.open", "binary-sensor.state.closed"],
  window: ["binary-sensor.state.open", "binary-sensor.state.closed"],
  garage_door: ["binary-sensor.state.open", "binary-sensor.state.closed"],
  opening: ["binary-sensor.state.open", "binary-sensor.state.closed"],
  lock: ["binary-sensor.state.unlocked", "binary-sensor.state.locked"],
  motion: ["binary-sensor.state.detected", "binary-sensor.state.clear"],
  occupancy: ["binary-sensor.state.occupied", "binary-sensor.state.clear"],
  presence: ["binary-sensor.state.home", "binary-sensor.state.away"],
  smoke: ["binary-sensor.state.detected", "binary-sensor.state.clear"],
  gas: ["binary-sensor.state.detected", "binary-sensor.state.clear"],
  moisture: ["binary-sensor.state.wet", "binary-sensor.state.dry"],
  vibration: ["binary-sensor.state.vibrating", "binary-sensor.state.still"],
  connectivity: ["binary-sensor.state.connected", "binary-sensor.state.disconnected"],
  battery: ["binary-sensor.state.low", "binary-sensor.state.normal"],
  plug: ["binary-sensor.state.plugged-in", "binary-sensor.state.unplugged"],
  problem: ["binary-sensor.state.problem", "binary-sensor.state.ok"],
  safety: ["binary-sensor.state.unsafe", "binary-sensor.state.safe"],
  tamper: ["binary-sensor.state.tampered", "binary-sensor.state.ok"],
  sound: ["binary-sensor.state.detected", "binary-sensor.state.clear"],
  heat: ["binary-sensor.state.hot", "binary-sensor.state.normal"],
  cold: ["binary-sensor.state.cold", "binary-sensor.state.normal"],
  light: ["binary-sensor.state.light", "binary-sensor.state.dark"],
  running: ["binary-sensor.state.running", "binary-sensor.state.stopped"],
  update: ["binary-sensor.state.available", "binary-sensor.state.up-to-date"],
};

const PLAIN_KEYS: [string, string] = ["binary-sensor.state.on", "binary-sensor.state.off"];

const CLASS_KEYS: Record<string, string> = {
  door: "binary-sensor.class.door",
  window: "binary-sensor.class.window",
  garage_door: "binary-sensor.class.garage-door",
  opening: "binary-sensor.class.opening",
  lock: "binary-sensor.class.lock",
  motion: "binary-sensor.class.motion",
  occupancy: "binary-sensor.class.occupancy",
  presence: "binary-sensor.class.presence",
  smoke: "binary-sensor.class.smoke",
  gas: "binary-sensor.class.gas",
  moisture: "binary-sensor.class.moisture",
  vibration: "binary-sensor.class.vibration",
  connectivity: "binary-sensor.class.connectivity",
  battery: "binary-sensor.class.battery",
  plug: "binary-sensor.class.plug",
  problem: "binary-sensor.class.problem",
  safety: "binary-sensor.class.safety",
  tamper: "binary-sensor.class.tamper",
  sound: "binary-sensor.class.sound",
  heat: "binary-sensor.class.heat",
  cold: "binary-sensor.class.cold",
  light: "binary-sensor.class.light",
  running: "binary-sensor.class.running",
  update: "binary-sensor.class.update",
};

export function getBinarySensorStateText(
  tools: Tools,
  sample: StateEntity | undefined,
  deviceClass: string | null,
  isOn: boolean,
): string {
  const state = isOn ? "on" : "off";
  const word = tools.translateState({
    domain: "binary_sensor",
    state,
    platform: sample?.platform ?? "",
    attributes: {},
    deviceClass,
  });
  if (word !== state) return word;
  const keys = Object.hasOwn(STATE_KEYS, deviceClass ?? "")
    ? STATE_KEYS[deviceClass ?? ""]
    : undefined;
  return tools.t((keys ?? PLAIN_KEYS)[isOn ? 0 : 1]);
}

export function binarySensorClass(tools: Pick<TranslationTools, "t">, deviceClass: string | null) {
  if (!deviceClass) return tools.t("binary-sensor.name");
  if (Object.hasOwn(CLASS_KEYS, deviceClass)) return tools.t(CLASS_KEYS[deviceClass] ?? "");
  return tools.t("binary-sensor.name");
}
