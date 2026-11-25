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
  useTranslation,
} from "@glasshome/widget-sdk";
import { createMemo, For, Show, untrack } from "solid-js";
import { ClimateSheet } from "../climate/sheet";
import { useThermostat } from "../common";
import { LightColour } from "../common/light-colour";
import { stateWord } from "../common/state-word";
import type { AreaMetrics } from "./utils";

const SECTIONS: { label: string; domains: string[]; thermostats?: true }[] = [
  { label: "area.sheet.lights", domains: ["light"] },
  { label: "area.sheet.climate", domains: ["fan", "humidifier"], thermostats: true },
  { label: "area.sheet.blinds", domains: ["cover", "lock"] },
  { label: "area.sheet.media", domains: ["media_player"] },
  { label: "area.sheet.switches", domains: ["switch", "input_boolean"] },
];

const OPEN_CLOSED = { on: "area.fact.open", off: "area.fact.closed" };
const DETECTED_CLEAR = { on: "area.fact.detected", off: "area.fact.clear" };
const FACT_WORD: Record<string, Record<string, string>> = {
  window: OPEN_CLOSED,
  door: OPEN_CLOSED,
  garage_door: OPEN_CLOSED,
  opening: OPEN_CLOSED,
  motion: DETECTED_CLEAR,
  occupancy: DETECTED_CLEAR,
  presence: { on: "area.fact.home", off: "area.fact.away" },
  moisture: { on: "area.fact.wet", off: "area.fact.dry" },
  smoke: { on: "area.fact.smoke", off: "area.fact.clear" },
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

/** One thermostat with everything it can set, its name and target heading the first section. */
function Thermostat(props: { entity: () => EntityView | undefined }) {
  const { t } = useTranslation();
  const thermostat = useThermostat(props.entity);
  return (
    <Show when={props.entity()}>
      {(e) => (
        <ClimateSheet
          entity={e()}
          thermostat={thermostat}
          targetLabel={e().friendlyName ?? t("area.sheet.thermostat")}
        />
      )}
    </Show>
  );
}

/**
 * What the area tile cannot show: its scenes, every device in the room, the lights' colour, its sensors.
 * `entry` names a thermostat to show alone, read once when the sheet mounts.
 */
export function AreaSheet(props: { area: AreaView; metrics: AreaMetrics; entry?: string }) {
  const { callService } = useService();
  const tools = useTranslation();
  const { t } = tools;

  const byDomain = (domains: string[]) =>
    props.area.entities.filter((e) => domains.includes(e.domain) && live(e.state));
  const scenes = () => byDomain(["scene"]);
  const ran = useConfirm();
  const thermostatIds = createMemo(() => byDomain(["climate"]).map((e) => e.id), undefined, {
    equals: (a, b) => a.length === b.length && a.every((id, i) => id === b[i]),
  });
  const thermostat = (id: string) => () => byDomain(["climate"]).find((e) => e.id === id);
  const entry = untrack(() => props.entry);
  const alone = () => (entry === undefined ? undefined : thermostat(entry)());

  const facts = createMemo((): PanelFact[] => {
    const out: PanelFact[] = [];
    if (props.metrics.co2 !== null)
      out.push({
        icon: "mdi:molecule-co2",
        label: t("area.sheet.co2"),
        value: t("area.sheet.co2-value", {
          value: tools.formatNumber(Math.round(props.metrics.co2)),
        }),
      });
    for (const e of byDomain(["binary_sensor"])) {
      const cls = e.deviceClass ?? "";
      const words = FACT_WORD[cls];
      if (!words) continue;
      out.push({
        icon: FACT_ICON[cls] ?? "mdi:eye",
        label: e.friendlyName,
        value: stateWord(tools, { ...e, state: e.state === "on" ? "on" : "off" }, words),
      });
    }
    return out.slice(0, 4);
  });

  return (
    <Show when={alone() === undefined} fallback={<Thermostat entity={alone} />}>
      <Show when={scenes().length}>
        <PanelSection label={t("area.sheet.scenes")}>
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
          <>
            <Show when={section.thermostats}>
              <For each={thermostatIds()}>{(id) => <Thermostat entity={thermostat(id)} />}</For>
            </Show>
            <Show when={byDomain(section.domains).length}>
              <PanelSection label={t(section.label)}>
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
          </>
        )}
      </For>
      <Show when={facts().length}>
        <PanelSection label={t("area.sheet.sensors")}>
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </Show>
  );
}
