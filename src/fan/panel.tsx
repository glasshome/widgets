import {
  type EntityView,
  isEntityActive,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { groupLine } from "../common/group";

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");

/** The fan, held: its picture big, a drag anywhere for speed, its modes, and every member of a group. */
export function FanPanel(props: {
  entities: EntityView[];
  name: string;
  art: string;
  presetIcon: (preset: string) => string;
}) {
  const { callService } = useService();

  const primary = () => props.entities[0];
  const count = () => props.entities.length;
  const ids = () => props.entities.map((e) => e.id);
  const isOn = () => props.entities.some((e) => isEntityActive(e));
  const onCount = () => props.entities.filter((e) => isEntityActive(e)).length;
  const unavailable = () =>
    count() === 1 && (primary()?.state === "unavailable" || primary()?.state === "unknown");
  const attr = () => primary()?.attributes ?? {};

  const supportsSpeed = () =>
    attr().percentage !== undefined || attr().percentage_step !== undefined;
  const speed = createMemo(() => {
    if (primary()?.state !== "on") return 0;
    const p = attr().percentage;
    return typeof p === "number" ? Math.round(p) : 100;
  });
  const [dragged, setDragged] = createSignal<number>();
  createEffect(() => {
    speed();
    setDragged(undefined);
  });
  const shown = () => dragged() ?? speed();

  const setSpeed = (value: number) =>
    void callService("fan", "set_percentage", { percentage: value }, { entity_id: ids() });

  const presets = () => (attr().preset_modes as string[] | undefined) ?? [];
  const preset = () => attr().preset_mode as string | undefined;
  const oscillating = () => attr().oscillating as boolean | undefined;
  const direction = () => attr().current_direction as string | undefined;

  const value = () => {
    if (unavailable()) return "--";
    if (dragged() !== undefined || (count() === 1 && isOn() && supportsSpeed())) {
      return (
        <>
          {shown()}
          <small>%</small>
        </>
      );
    }
    return isOn() ? "On" : "Off";
  };
  const eyebrow = () => {
    if (unavailable()) return "Unavailable";
    if (count() > 1) return groupLine(onCount(), count(), { active: "on", rest: "off" });
    const p = preset();
    return isOn() && p ? titleCase(p) : undefined;
  };

  return (
    <WidgetPanel
      icon={isOn() ? "mdi:fan" : "mdi:fan-off"}
      tone={isOn() ? "var(--tone-success)" : "var(--tone-neutral)"}
      eyebrow={eyebrow()}
      name={props.name}
      art={
        <img
          src={props.art}
          alt=""
          style={{ filter: isOn() ? "none" : "brightness(0.7) saturate(0.85)" }}
        />
      }
      hint={supportsSpeed() ? "Drag anywhere to set the speed" : undefined}
      value={value()}
      slide={
        supportsSpeed() ? { value: shown(), onChange: setDragged, onCommit: setSpeed } : undefined
      }
      actions={
        presets().length || oscillating() !== undefined || direction() !== undefined ? (
          <>
            <Show when={presets().length}>
              <ToggleGroup
                aria-label="Preset"
                tone="var(--widget-color)"
                value={preset() ?? null}
                onChange={(p: string | null) =>
                  p &&
                  void callService(
                    "fan",
                    "set_preset_mode",
                    { preset_mode: p },
                    { entity_id: ids() },
                  )
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
            </Show>
            <Show when={count() === 1 && oscillating() !== undefined}>
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
            <Show when={count() === 1 && direction() !== undefined}>
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
          </>
        ) : undefined
      }
    >
      {count() > 1 ? (
        <PanelSection label="Fans">
          <PanelRows>
            <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
          </PanelRows>
        </PanelSection>
      ) : undefined}
    </WidgetPanel>
  );
}
