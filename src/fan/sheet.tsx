import {
  type EntityView,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  useService,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";

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
  const { callService } = useService();
  const primary = () => props.entities[0];
  const single = () => (props.entities.length === 1 ? primary() : undefined);
  const ids = () => props.entities.map((e) => e.id);

  const presets = () => presetsOf(primary());
  const preset = () => primary()?.attributes.preset_mode as string | undefined;
  const oscillating = () => oscillatingOf(single());
  const direction = () => directionOf(single());

  return (
    <>
      <Show when={presets().length}>
        <PanelSection label="Preset">
          <ToggleGroup
            aria-label="Preset"
            tone="var(--widget-color)"
            value={preset() ?? null}
            onChange={(p: string | null) =>
              p &&
              void callService("fan", "set_preset_mode", { preset_mode: p }, { entity_id: ids() })
            }
          >
            <For each={presets()}>
              {(p) => (
                <ToggleGroupItem value={p} aria-label={titleCase(p)}>
                  <Icon icon={props.presetIcon(p)} width={18} />
                  {titleCase(p)}
                </ToggleGroupItem>
              )}
            </For>
          </ToggleGroup>
        </PanelSection>
      </Show>
      <Show when={oscillating() !== undefined || direction() !== undefined}>
        <PanelSection label="Air flow">
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
                Oscillate
              </Toggle>
            </Show>
            <Show when={direction() !== undefined}>
              <ToggleGroup
                aria-label="Direction"
                tone="var(--widget-color)"
                value={direction() ?? null}
                onChange={(d: string | null) =>
                  d &&
                  void callService("fan", "set_direction", { direction: d }, { entity_id: ids() })
                }
              >
                <ToggleGroupItem value="forward" aria-label="Forward">
                  <Icon icon="mdi:rotate-right" width={18} />
                  Forward
                </ToggleGroupItem>
                <ToggleGroupItem value="reverse" aria-label="Reverse">
                  <Icon icon="mdi:rotate-left" width={18} />
                  Reverse
                </ToggleGroupItem>
              </ToggleGroup>
            </Show>
          </div>
        </PanelSection>
      </Show>
      <Show when={props.entities.length > 1}>
        <PanelSection label="Fans">
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
