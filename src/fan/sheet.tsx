import {
  type EntityView,
  Icon,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  useService,
  useTranslation,
} from "@glasshome/widget-sdk";
import { For, Show } from "solid-js";
import { presetWord } from "./words";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");

const presetsOf = (e: EntityView | undefined) =>
  (e?.attributes.preset_modes as string[] | undefined) ?? [];
const oscillatingOf = (e: EntityView | undefined) =>
  e?.attributes.oscillating as boolean | undefined;
const directionOf = (e: EntityView | undefined) =>
  e?.attributes.current_direction as string | undefined;

export const fanHasExtras = (entities: EntityView[]) => {
  const single = entities.length === 1 ? entities[0] : undefined;
  return (
    entities.length > 1 ||
    presetsOf(entities[0]).length > 0 ||
    oscillatingOf(single) !== undefined ||
    directionOf(single) !== undefined
  );
};

/** What the fan tile cannot show: every preset, oscillation and direction, each fan of a group. */
export function FanSheet(props: {
  entities: EntityView[];
  name: string;
  presetIcon: (preset: string) => string;
}) {
  const tools = useTranslation();
  const { t } = tools;
  const { callService } = useService();
  const primary = () => props.entities[0];
  const single = () => (props.entities.length === 1 ? primary() : undefined);
  const ids = () => props.entities.map((e) => e.id);

  const presets = () => presetsOf(primary());
  const presetLabel = (p: string) => presetWord(tools, primary(), p, titleCase);
  const preset = () => primary()?.attributes.preset_mode as string | undefined;
  const oscillating = () => oscillatingOf(single());
  const direction = () => directionOf(single());

  return (
    <>
      <Show when={presets().length}>
        <PanelSection label={t("fan.preset.label")}>
          <ToggleGroup
            aria-label={t("fan.preset.label")}
            tone="var(--widget-color)"
            value={preset() ?? null}
            onChange={(p: string | null) =>
              p &&
              void callService(
                "fan",
                "set_preset_mode",
                { preset_mode: p },
                {
                  entity_id: props.entities
                    .filter((e) => presetsOf(e).includes(p))
                    .map((e) => e.id),
                },
              )
            }
          >
            <For each={presets()}>
              {(p) => (
                <ToggleGroupItem value={p} aria-label={presetLabel(p)}>
                  <Icon icon={props.presetIcon(p)} width={18} />
                  {presetLabel(p)}
                </ToggleGroupItem>
              )}
            </For>
          </ToggleGroup>
        </PanelSection>
      </Show>
      <Show when={oscillating() !== undefined || direction() !== undefined}>
        <PanelSection label={t("fan.sheet.air-flow")}>
          <div class="glasshome-sheet-actions">
            <Show when={oscillating() !== undefined}>
              <Toggle
                variant="outline"
                pressed={oscillating() === true}
                onChange={(on: boolean) =>
                  void callService("fan", "oscillate", { oscillating: on }, { entity_id: ids() })
                }
              >
                <Icon icon="mdi:arrow-oscillating" width={18} />
                {t("fan.sheet.oscillate")}
              </Toggle>
            </Show>
            <Show when={direction() !== undefined}>
              <ToggleGroup
                aria-label={t("fan.sheet.direction")}
                tone="var(--widget-color)"
                value={direction() ?? null}
                onChange={(d: string | null) =>
                  d &&
                  void callService("fan", "set_direction", { direction: d }, { entity_id: ids() })
                }
              >
                <ToggleGroupItem value="forward" aria-label={t("fan.sheet.forward")}>
                  <Icon icon="mdi:rotate-right" width={18} />
                  {t("fan.sheet.forward")}
                </ToggleGroupItem>
                <ToggleGroupItem value="reverse" aria-label={t("fan.sheet.reverse")}>
                  <Icon icon="mdi:rotate-left" width={18} />
                  {t("fan.sheet.reverse")}
                </ToggleGroupItem>
              </ToggleGroup>
            </Show>
          </div>
        </PanelSection>
      </Show>
      <Show when={props.entities.length > 1}>
        <PanelSection label={t("fan.sheet.fans")}>
          <PanelRows>
            <For each={props.entities}>
              {(e) => <PanelEntityRow entityId={e.id} within={props.name} />}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
    </>
  );
}
