import {
  type Color,
  ColorSlider,
  ColorWheel,
  type EntityView,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  parseColor,
  SwatchPicker,
  useService,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show } from "solid-js";
import { LIGHT_SWATCHES, swatchService } from "../common/light-swatches";
import { ModeChips } from "../common/mode-chips";

const COLOUR_MODES = ["hs", "rgb", "xy", "rgbw", "rgbww"];
const EFFECT_FEATURE = 4;

const modes = (e: EntityView) => (e.attributes.supported_color_modes as string[] | undefined) ?? [];
const takesColour = (e: EntityView) => modes(e).some((m) => COLOUR_MODES.includes(m));
const takesWhite = (e: EntityView) => takesColour(e) || modes(e).includes("color_temp");
const effectsOf = (e: EntityView) =>
  ((e.attributes.supported_features as number | undefined) ?? 0) & EFFECT_FEATURE
    ? ((e.attributes.effect_list as string[] | undefined) ?? [])
    : [];
const isWhite = (swatch: string) => "color_temp_kelvin" in swatchService(swatch);

const colorToHs = (c: Color): [number, number] => [
  Math.round(c.getChannelValue("hue")),
  Math.round(c.getChannelValue("saturation")),
];

export const lightHasExtras = (entities: EntityView[]) =>
  entities.length > 1 || entities.some((e) => takesWhite(e) || effectsOf(e).length > 0);

/** What the light tile cannot show: its colour, each lamp of a group, its effects. */
export function LightSheet(props: { entities: EntityView[]; name: string }) {
  const { callService } = useService();
  const isGroup = () => props.entities.length > 1;

  const anyColour = () => props.entities.some(takesColour);
  const anyWhite = () => props.entities.some(takesWhite);
  const swatches = () => (anyColour() ? LIGHT_SWATCHES : LIGHT_SWATCHES.filter(isWhite));

  /** The lights that are on and can take it; all that can, when none is on. */
  const targets = (can: (e: EntityView) => boolean) => {
    const capable = props.entities.filter(can);
    const lit = capable.filter((e) => e.state === "on");
    return (lit.length ? lit : capable).map((e) => e.id);
  };

  const [swatch, setSwatch] = createSignal<string | null>(null);
  const [hs, setHs] = createSignal<[number, number]>();
  const colourLight = () => props.entities.find((e) => takesColour(e) && e.state === "on");
  const wheelColor = () => {
    const c = hs() ?? (colourLight()?.attributes.hs_color as [number, number] | undefined);
    return parseColor(`hsl(${c?.[0] ?? 0}, ${c?.[1] ?? 100}%, 50%)`);
  };

  const pickSwatch = (color: string) => {
    setSwatch(color);
    setHs(undefined);
    const ids = targets(isWhite(color) ? takesWhite : takesColour);
    if (ids.length) void callService("light", "turn_on", swatchService(color), { entity_id: ids });
  };
  const sendHs = (c: Color) => {
    const value = colorToHs(c);
    setSwatch(null);
    setHs(value);
    const ids = targets(takesColour);
    if (ids.length) void callService("light", "turn_on", { hs_color: value }, { entity_id: ids });
  };

  const effects = createMemo(() => [...new Set(props.entities.flatMap(effectsOf))]);
  const activeEffect = () =>
    props.entities.find((e) => e.state === "on" && typeof e.attributes.effect === "string")
      ?.attributes.effect as string | undefined;
  const setEffect = (effect: string) => {
    const ids = props.entities.filter((e) => effectsOf(e).includes(effect)).map((e) => e.id);
    void callService("light", "turn_on", { effect }, { entity_id: ids });
  };

  return (
    <>
      <Show when={anyWhite()}>
        <PanelSection label="Colour">
          <SwatchPicker
            value={swatch()}
            colors={swatches()}
            onChange={pickSwatch}
            aria-label={isGroup() ? "Colour of the lights that are on" : "Colour"}
          />
          <Show when={anyColour()}>
            <ColorWheel
              class="mx-auto"
              size={200}
              value={wheelColor()}
              onChange={(c) => setHs(colorToHs(c))}
              onChangeEnd={sendHs}
              aria-label="Hue"
            />
            <ColorSlider
              channel="saturation"
              value={wheelColor()}
              onChange={(c) => setHs(colorToHs(c))}
              onChangeEnd={sendHs}
              aria-label="Saturation"
            />
          </Show>
        </PanelSection>
      </Show>
      <Show when={isGroup()}>
        <PanelSection label="Lamps">
          <PanelRows>
            <For each={props.entities}>
              {(e) => <PanelEntityRow entityId={e.id} within={props.name} />}
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
