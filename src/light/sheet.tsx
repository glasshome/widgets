import {
  Button,
  type EntityView,
  Icon,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  useService,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show } from "solid-js";
import { effectsOf, LightColour, takesWhite } from "../common/light-colour";
import { ModeChips } from "../common/mode-chips";

export const lightHasExtras = (entities: EntityView[]) =>
  entities.length > 1 || entities.some((e) => takesWhite(e) || effectsOf(e).length > 0);

/** What the light tile cannot show: colour, each lamp of a group (hold one to set it alone), effects. */
export function LightSheet(props: { entities: EntityView[]; name: string }) {
  const { callService } = useService();
  const isGroup = () => props.entities.length > 1;
  const [focus, setFocus] = createSignal<string>();
  const scope = createMemo(() => {
    const id = focus();
    const one = id ? props.entities.find((e) => e.id === id) : undefined;
    return one ? [one] : props.entities;
  });

  const ids = (list: EntityView[]) => list.map((e) => e.id);

  const effects = createMemo(() => [...new Set(scope().flatMap(effectsOf))]);
  const activeEffect = () =>
    scope().find((e) => e.state === "on" && typeof e.attributes.effect === "string")?.attributes
      .effect as string | undefined;
  const setEffect = (effect: string) => {
    const lamps = scope().filter((e) => effectsOf(e).includes(effect));
    void callService("light", "turn_on", { effect }, { entity_id: ids(lamps) });
  };

  return (
    <>
      <Show when={focus()}>
        {(id) => (
          <>
            <div class="glasshome-sheet-actions">
              <Button variant="outline" size="sm" onClick={() => setFocus(undefined)}>
                <Icon icon="mdi:chevron-left" />
                All lamps
              </Button>
            </div>
            <PanelSection label="Lamp">
              <PanelRows>
                <PanelEntityRow entityId={id()} within={props.name} />
              </PanelRows>
            </PanelSection>
          </>
        )}
      </Show>
      <LightColour lamps={scope()} />
      <Show when={isGroup() && !focus()}>
        <PanelSection label="Lamps · hold one to set it alone">
          <PanelRows>
            <For each={props.entities}>
              {(e) => (
                <PanelEntityRow entityId={e.id} within={props.name} onHold={() => setFocus(e.id)} />
              )}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={effects().length}>
        <PanelSection label="Effects">
          <ModeChips modes={effects()} active={activeEffect()} capitalize onSelect={setEffect} />
        </PanelSection>
      </Show>
    </>
  );
}
