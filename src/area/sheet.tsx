import {
  type AreaView,
  Button,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  useService,
} from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";
import { LightColour } from "../common/light-colour";
import type { AreaMetrics } from "./utils";

const SECTIONS: { label: string; domains: string[] }[] = [
  { label: "Lights", domains: ["light"] },
  { label: "Climate and air", domains: ["climate", "fan", "humidifier"] },
  { label: "Blinds and doors", domains: ["cover", "lock"] },
  { label: "Media", domains: ["media_player"] },
  { label: "Switches", domains: ["switch", "input_boolean"] },
];

const FACT_WORD: Record<string, [string, string]> = {
  window: ["Open", "Closed"],
  door: ["Open", "Closed"],
  garage_door: ["Open", "Closed"],
  opening: ["Open", "Closed"],
  motion: ["Detected", "Clear"],
  occupancy: ["Detected", "Clear"],
  presence: ["Home", "Away"],
  moisture: ["Wet", "Dry"],
  smoke: ["Smoke", "Clear"],
};
const FACT_ICON: Record<string, string> = {
  window: "mdi:window-closed-variant",
  door: "mdi:door",
  garage_door: "mdi:garage",
  opening: "mdi:door",
  motion: "mdi:motion-sensor",
  occupancy: "mdi:account",
  presence: "mdi:account",
  moisture: "mdi:water",
  smoke: "mdi:smoke-detector",
};

const live = (s: string) => s !== "unavailable" && s !== "unknown";

/** What the area tile cannot show: its scenes, every device in the room, the lights' colour, its sensors. */
export function AreaSheet(props: { area: AreaView; metrics: AreaMetrics }) {
  const { callService } = useService();

  const byDomain = (domains: string[]) =>
    props.area.entities.filter((e) => domains.includes(e.domain) && live(e.state));
  const scenes = () => byDomain(["scene"]);

  const facts = createMemo((): PanelFact[] => {
    const out: PanelFact[] = [];
    if (props.metrics.co2 !== null)
      out.push({
        icon: "mdi:molecule-co2",
        label: "CO₂",
        value: `${Math.round(props.metrics.co2)} ppm`,
      });
    for (const e of byDomain(["binary_sensor"])) {
      const cls = e.deviceClass ?? "";
      const words = FACT_WORD[cls];
      if (!words) continue;
      out.push({
        icon: FACT_ICON[cls] ?? "mdi:eye",
        label: e.friendlyName,
        value: e.state === "on" ? words[0] : words[1],
      });
    }
    return out.slice(0, 4);
  });

  return (
    <>
      <Show when={scenes().length}>
        <PanelSection label="Scenes">
          <div class="glasshome-sheet-actions">
            <For each={scenes()}>
              {(s) => (
                <Button
                  variant="outline"
                  onClick={() => void callService("scene", "turn_on", {}, { entity_id: s.id })}
                >
                  {s.friendlyName}
                </Button>
              )}
            </For>
          </div>
        </PanelSection>
      </Show>
      <For each={SECTIONS}>
        {(section) => (
          <Show when={byDomain(section.domains).length}>
            <PanelSection label={section.label}>
              <PanelRows>
                <For each={byDomain(section.domains)}>
                  {(e) => <PanelEntityRow entityId={e.id} within={props.area.name} />}
                </For>
              </PanelRows>
            </PanelSection>
            <Show when={section.domains.includes("light")}>
              <LightColour lamps={byDomain(["light"])} />
            </Show>
          </Show>
        )}
      </For>
      <Show when={facts().length}>
        <PanelSection label="Sensors">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </>
  );
}
