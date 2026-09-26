import {
  Button,
  type Color,
  ColorDisc,
  type ColorDiscPin,
  type EntityView,
  Icon,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  parseColor,
  TemperatureBar,
  type TemperaturePin,
  useService,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, Show } from "solid-js";
import { ModeChips } from "../common/mode-chips";

const COLOUR_MODES = ["hs", "rgb", "xy", "rgbw", "rgbww"];
const EFFECT_FEATURE = 4;
const RECENT_KEY = "glasshome.light.recent-colours";
const RECENT_MAX = 4;

interface White {
  id: string;
  label: string;
  kelvin: number;
  color: string;
  hue: number;
  saturation: number;
}

/* The whites people reach for, warm to cool. Hue and saturation only place the pin on the disc, a pin
   apart along the warm side; the lamp gets the Kelvin (or, colour-only, this hue and saturation). */
const WHITES: White[] = [
  { id: "warm", label: "Warm white", kelvin: 2200, color: "#ffb35a", hue: 25, saturation: 92 },
  { id: "soft", label: "Soft white", kelvin: 2700, color: "#ffd79a", hue: 36, saturation: 64 },
  { id: "neutral", label: "Neutral white", kelvin: 4000, color: "#fff1dc", hue: 44, saturation: 36 },
  { id: "cool", label: "Cool white", kelvin: 6000, color: "#dfeeff", hue: 214, saturation: 28 },
];

/* Colours offered before the household has picked any of its own. */
const STARTER_COLOURS: [number, number][] = [
  [5, 70],
  [330, 62],
  [262, 60],
  [216, 75],
];

const modes = (e: EntityView) => (e.attributes.supported_color_modes as string[] | undefined) ?? [];
const takesColour = (e: EntityView) => modes(e).some((m) => COLOUR_MODES.includes(m));
const takesTemperature = (e: EntityView) => modes(e).includes("color_temp");
const takesWhite = (e: EntityView) => takesColour(e) || takesTemperature(e);
const effectsOf = (e: EntityView) =>
  ((e.attributes.supported_features as number | undefined) ?? 0) & EFFECT_FEATURE
    ? ((e.attributes.effect_list as string[] | undefined) ?? [])
    : [];

const hsCss = (h: number, s: number) => parseColor(`hsb(${h}, ${s}%, 100%)`).toString("css");

function readRecent(): [number, number][] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(raw) ? raw.filter((v) => Array.isArray(v) && v.length === 2) : [];
  } catch {
    return [];
  }
}

function rememberColour(hs: [number, number], list: [number, number][]): [number, number][] {
  const near = (a: [number, number]) => Math.abs(a[0] - hs[0]) < 8 && Math.abs(a[1] - hs[1]) < 8;
  const next = [hs, ...list.filter((c) => !near(c))].slice(0, RECENT_MAX);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // A browser without storage keeps the colours for this visit only.
  }
  return next;
}

export const lightHasExtras = (entities: EntityView[]) =>
  entities.length > 1 || entities.some((e) => takesWhite(e) || effectsOf(e).length > 0);

/**
 * What the light tile cannot show. Colour is a disc with the whites and your recent colours pinned on
 * it: one tap for the usual, a drag for something new. Whites go to every lamp as a temperature where
 * it takes one; colours reach the lamps that can show them. Holding a lamp sets that lamp alone.
 */
export function LightSheet(props: { entities: EntityView[]; name: string }) {
  const { callService } = useService();
  const isGroup = () => props.entities.length > 1;
  const [focus, setFocus] = createSignal<string>();
  const scope = createMemo(() => {
    const id = focus();
    const one = id ? props.entities.find((e) => e.id === id) : undefined;
    return one ? [one] : props.entities;
  });

  /** The lamps a change reaches: those in scope that can take it and are on, or all that can when none is. */
  const targets = (can: (e: EntityView) => boolean) => {
    const capable = scope().filter(can);
    const lit = capable.filter((e) => e.state === "on");
    return lit.length ? lit : capable;
  };
  const ids = (list: EntityView[]) => list.map((e) => e.id);

  const [recent, setRecent] = createSignal(readRecent());
  const colours = () => (recent().length ? recent() : STARTER_COLOURS);
  const [active, setActive] = createSignal<string>();

  const sendWhite = (w: White) => {
    const temperature = targets(takesTemperature);
    const colourOnly = targets((e) => takesColour(e) && !takesTemperature(e));
    if (temperature.length)
      void callService(
        "light",
        "turn_on",
        { color_temp_kelvin: w.kelvin },
        { entity_id: ids(temperature) },
      );
    if (colourOnly.length)
      void callService(
        "light",
        "turn_on",
        { hs_color: [w.hue, w.saturation] },
        { entity_id: ids(colourOnly) },
      );
  };
  const sendColour = (hs: [number, number]) => {
    const lamps = targets(takesColour);
    if (lamps.length)
      void callService("light", "turn_on", { hs_color: hs }, { entity_id: ids(lamps) });
    setRecent((list) => rememberColour(hs, list));
  };

  const pins = (): ColorDiscPin[] => [
    ...WHITES.map((w) => ({
      id: w.id,
      color: w.color,
      label: w.label,
      hue: w.hue,
      saturation: w.saturation,
    })),
    ...colours().map(([h, s]) => ({
      id: `c:${h}:${s}`,
      color: hsCss(h, s),
      label: `Colour ${h}°, ${s}%`,
      hue: h,
      saturation: s,
    })),
  ];
  const pick = (id: string) => {
    setActive(id);
    setDragged(undefined);
    const white = WHITES.find((w) => w.id === id);
    if (white) return sendWhite(white);
    const [, h, s] = id.split(":");
    sendColour([Number(h), Number(s)]);
  };

  const [dragged, setDragged] = createSignal<Color>();
  const shownColour = () => {
    const d = dragged();
    if (d) return d;
    const lamp = scope().find((e) => takesColour(e) && e.state === "on");
    const hs = lamp?.attributes.hs_color as [number, number] | undefined;
    return parseColor(`hsb(${Math.round(hs?.[0] ?? 36)}, ${Math.round(hs?.[1] ?? 42)}%, 100%)`);
  };
  const endDrag = (c: Color) => {
    setActive(undefined);
    sendColour([Math.round(c.getChannelValue("hue")), Math.round(c.getChannelValue("saturation"))]);
  };

  const whitePins = (): TemperaturePin[] =>
    WHITES.map((w) => ({ id: w.id, color: w.color, label: w.label, kelvin: w.kelvin }));
  const [draggedKelvin, setDraggedKelvin] = createSignal<number>();
  const temperatureLamp = () => scope().find((e) => takesTemperature(e) && e.state === "on");
  const kelvin = () =>
    draggedKelvin() ??
    (temperatureLamp()?.attributes.color_temp_kelvin as number | undefined) ??
    2700;
  const kelvinRange = () => {
    const lamp = temperatureLamp() ?? scope().find(takesTemperature);
    return {
      min: (lamp?.attributes.min_color_temp_kelvin as number | undefined) ?? 2000,
      max: (lamp?.attributes.max_color_temp_kelvin as number | undefined) ?? 6500,
    };
  };
  const sendKelvin = (k: number) => {
    setActive(undefined);
    const lamps = targets(takesTemperature);
    if (lamps.length)
      void callService("light", "turn_on", { color_temp_kelvin: k }, { entity_id: ids(lamps) });
  };

  const anyColour = () => scope().some(takesColour);
  const anyWhite = () => scope().some(takesWhite);
  const reach = () => {
    const whiteCapable = scope().filter(takesWhite).length;
    const colourCapable = scope().filter(takesColour).length;
    return colourCapable < whiteCapable
      ? `Colour reaches ${colourCapable} of ${whiteCapable} lamps`
      : undefined;
  };

  const effects = createMemo(() => [...new Set(scope().flatMap(effectsOf))]);
  const activeEffect = () =>
    scope().find((e) => e.state === "on" && typeof e.attributes.effect === "string")?.attributes
      .effect as string | undefined;
  const setEffect = (effect: string) => {
    const lamps = scope().filter((e) => effectsOf(e).includes(effect));
    void callService("light", "turn_on", { effect }, { entity_id: ids(lamps) });
  };

  const focusedName = () => scope()[0]?.friendlyName;

  return (
    <>
      <Show when={focus()}>
        <div class="glasshome-sheet-actions">
          <Button variant="outline" size="sm" onClick={() => setFocus(undefined)}>
            <Icon icon="mdi:chevron-left" />
            All lamps
          </Button>
        </div>
      </Show>
      <Show when={anyWhite()}>
        <PanelSection label={focus() ? `Colour · ${focusedName()}` : "Colour"}>
          <Show
            when={anyColour()}
            fallback={
              <TemperatureBar
                value={kelvin()}
                min={kelvinRange().min}
                max={kelvinRange().max}
                pins={whitePins()}
                activePin={active()}
                onPin={pick}
                onChange={setDraggedKelvin}
                onChangeEnd={(k) => {
                  setDraggedKelvin(undefined);
                  sendKelvin(k);
                }}
              />
            }
          >
            <ColorDisc
              class="mx-auto"
              size={272}
              value={shownColour()}
              pins={pins()}
              activePin={active()}
              onPin={pick}
              onChange={setDragged}
              onChangeEnd={(c) => {
                setDragged(undefined);
                endDrag(c);
              }}
            />
          </Show>
          <Show when={reach()}>{(line) => <p class="glasshome-panel-label">{line()}</p>}</Show>
        </PanelSection>
      </Show>
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
