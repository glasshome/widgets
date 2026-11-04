import {
  type AreaView,
  Button,
  type EntityView,
  Icon,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  useConfirm,
  useService,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show, untrack } from "solid-js";
import { ClimateSheet } from "../climate/sheet";
import { useThermostat } from "../common";
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

/** One thermostat of the room with everything it can set. */
function ThermostatFocus(props: { entity: () => EntityView | undefined; onBack: () => void }) {
  const thermostat = useThermostat(props.entity);
  return (
    <>
      <div class="glasshome-sheet-actions">
        <Button variant="outline" size="sm" onClick={() => props.onBack()}>
          <Icon icon="mdi:chevron-left" />
          Whole room
        </Button>
      </div>
      <Show when={props.entity()}>
        {(e) => (
          <ClimateSheet
            entity={e()}
            thermostat={thermostat}
            targetLabel={e().friendlyName ?? "Thermostat"}
          />
        )}
      </Show>
    </>
  );
}

/**
 * What the area tile cannot show: its scenes, every device in the room, the lights' colour, its sensors.
 * `entry` names a thermostat to open on, read once when the sheet mounts.
 */
export function AreaSheet(props: { area: AreaView; metrics: AreaMetrics; entry?: string }) {
  const { callService } = useService();

  const byDomain = (domains: string[]) =>
    props.area.entities.filter((e) => domains.includes(e.domain) && live(e.state));
  const scenes = () => byDomain(["scene"]);
  const ran = useConfirm();
  const [focus, setFocus] = createSignal(untrack(() => props.entry));
  const focused = () => {
    const id = focus();
    return id === undefined ? undefined : byDomain(["climate"]).find((e) => e.id === id);
  };
  const hint = (section: (typeof SECTIONS)[number]) =>
    section.domains.includes("climate") && byDomain(["climate"]).length > 0
      ? `${section.label} · hold a thermostat to set it`
      : section.label;

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
    <Show
      when={focused() === undefined}
      fallback={<ThermostatFocus entity={focused} onBack={() => setFocus(undefined)} />}
    >
      <Show when={scenes().length}>
        <PanelSection label="Scenes">
          <div class="glasshome-sheet-actions">
            <For each={scenes()}>
              {(s) => (
                <Button
                  variant={ran.has(s.id) ? "default" : "outline"}
                  onClick={() =>
                    void ran.run([s.id], () =>
                      callService("scene", "turn_on", {}, { entity_id: s.id }),
                    )
                  }
                >
                  <Icon icon={ran.has(s.id) ? "mdi:check" : "mdi:play"} />
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
            <PanelSection label={hint(section)}>
              <PanelRows>
                <For each={byDomain(section.domains)}>
                  {(e) => (
                    <PanelEntityRow
                      entityId={e.id}
                      within={props.area.name}
                      onHold={e.domain === "climate" ? () => setFocus(e.id) : undefined}
                    />
                  )}
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
    </Show>
  );
}
