import type { TranslationTools } from "@glasshome/widget-sdk";

/** Home Assistant keeps a scene's last run as its state, so this holds on every screen. */
function lastRan(tools: TranslationTools, states: string[]): string | undefined {
  const stamps = states.map((s) => new Date(s).getTime()).filter((t) => !Number.isNaN(t));
  if (stamps.length === 0) return undefined;
  const at = new Date(Math.max(...stamps));
  const time = tools.formatDate(at, { hour: "numeric", minute: "2-digit" });
  if (at.toDateString() === new Date().toDateString())
    return tools.t("scene.eyebrow.ran-at", { time });
  const day = tools.formatDate(at, { weekday: "short" });
  return tools.t("scene.eyebrow.ran-on", { day, time });
}

export function sceneEyebrow(
  tools: TranslationTools,
  input: { states: string[]; name: string },
): string | undefined {
  const ran = lastRan(tools, input.states);
  if (ran) return ran;
  const count = input.states.length;
  if (count === 1) return tools.t("scene.name.one");
  // A group named "Scenes" already says what the count would.
  return input.name === tools.t("scene.name.many")
    ? undefined
    : tools.t("scene.eyebrow.count", { count });
}
