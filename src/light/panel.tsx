import {
  Button,
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
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show } from "solid-js";
import { LampArt, type LampKind } from "../common/art/lamp";
import { LIGHT_SWATCHES, swatchService } from "../common/light-swatches";
import { ModeChips } from "../common/mode-chips";
import { hsToCSS } from "./utils";

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

function whiteWord(kelvin: number) {
  if (kelvin < 3200) return "Warm white";
  if (kelvin < 5000) return "Neutral white";
  return "Cool white";
}

/** The light, held: its lamp big and lit, dimmed by a drag, coloured in one tap. */
export function LightPanel(props: {
  entities: EntityView[];
  name: string;
  eyebrow: string;
  lamp: LampKind;
  brightness: number;
  color: string;
}) {
  const { callService } = useService();
  const ids = () => props.entities.map((e) => e.id);
  const isGroup = () => props.entities.length > 1;
  const on = () => props.entities.some((e) => e.state === "on");

  const [dragged, setDragged] = createSignal<number>();
  const level = () => dragged() ?? (on() ? props.brightness : 0);
  const setLevel = (value: number) => {
    setDragged(undefined);
    void callService(
      "light",
      value > 0 ? "turn_on" : "turn_off",
      value > 0 ? { brightness_pct: value } : {},
      { entity_id: ids() },
    );
  };
  const toggleAll = () =>
    void callService("light", on() ? "turn_off" : "turn_on", {}, { entity_id: ids() });

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
  const currentHs = () =>
    hs() ?? (colourLight()?.attributes.hs_color as [number, number] | undefined);
  const wheelColor = () => {
    const c = currentHs();
    return parseColor(`hsl(${c?.[0] ?? 0}, ${c?.[1] ?? 100}%, 50%)`);
  };
  const stageColor = () => {
    const c = hs();
    return c ? hsToCSS(c) : props.color;
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

  const hasAside = () => isGroup() || anyWhite() || effects().length > 0;

  const caption = () => {
    const lit = props.entities.find((e) => e.state === "on");
    if (!lit || lit.attributes.color_mode !== "color_temp") return undefined;
    const k = lit.attributes.color_temp_kelvin;
    return typeof k === "number" ? whiteWord(k) : undefined;
  };

  return (
    <WidgetPanel
      icon={on() ? "mdi:lightbulb" : "mdi:lightbulb-outline"}
      tone={on() ? stageColor() : undefined}
      eyebrow={props.eyebrow}
      name={props.name}
      art={<LampArt kind={props.lamp} on={level() > 0} brightness={level()} color={stageColor()} />}
      hint={isGroup() ? "Drag anywhere to dim them all" : "Drag anywhere to dim"}
      value={
        level() > 0 ? (
          <>
            {level()}
            <small>%</small>
          </>
        ) : (
          "Off"
        )
      }
      caption={caption()}
      slide={{ value: level(), onChange: setDragged, onCommit: setLevel }}
      actions={
        <Button variant="outline" onClick={toggleAll}>
          {on() ? (isGroup() ? "All off" : "Turn off") : isGroup() ? "All on" : "Turn on"}
        </Button>
      }
    >
      {hasAside() ? (
        <>
          <Show when={isGroup()}>
            <PanelSection label="Lights">
              <PanelRows>
                <For each={props.entities}>
                  {(e) => <PanelEntityRow entityId={e.id} within={props.name} />}
                </For>
              </PanelRows>
            </PanelSection>
          </Show>
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
                  size={isGroup() ? 200 : 260}
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
          <Show when={effects().length}>
            <PanelSection label="Effects">
              <ModeChips
                modes={effects()}
                active={activeEffect()}
                capitalize
                onSelect={setEffect}
              />
            </PanelSection>
          </Show>
        </>
      ) : undefined}
    </WidgetPanel>
  );
}
