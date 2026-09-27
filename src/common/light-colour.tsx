import {
  type Color,
  ColorDisc,
  type EntityView,
  PanelSection,
  parseColor,
  SwatchPicker,
  TemperatureBar,
  useService,
} from "@glasshome/widget-sdk";
import { createEffect, createSignal, on, Show } from "solid-js";

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

/* The whites people reach for, warm to cool. A colour-only lamp gets this hue and saturation instead. */
const WHITES: White[] = [
  { id: "warm", label: "Warm white", kelvin: 2200, color: "#ffb35a", hue: 25, saturation: 92 },
  { id: "soft", label: "Soft white", kelvin: 2700, color: "#ffd79a", hue: 36, saturation: 64 },
  {
    id: "neutral",
    label: "Neutral white",
    kelvin: 4000,
    color: "#fff1dc",
    hue: 44,
    saturation: 36,
  },
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
export const takesWhite = (e: EntityView) => takesColour(e) || takesTemperature(e);
export const effectsOf = (e: EntityView) =>
  ((e.attributes.supported_features as number | undefined) ?? 0) & EFFECT_FEATURE
    ? ((e.attributes.effect_list as string[] | undefined) ?? [])
    : [];

const hsCss = (h: number, s: number) => parseColor(`hsb(${h}, ${s}%, 100%)`).toString("css");

function readRecent(): [number, number][] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    const hs = (v: unknown): v is [number, number] =>
      Array.isArray(v) &&
      v.length === 2 &&
      v.every((n) => typeof n === "number" && Number.isFinite(n));
    return Array.isArray(raw) ? raw.filter(hs).slice(0, RECENT_MAX) : [];
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

/**
 * Colour for a set of lamps, the same on every sheet: presets (whites and this screen's recent colours),
 * a white bar over the lamps' Kelvin span, a disc for lamps that take colour, and a line when colour
 * reaches only some of them. Whites go as a temperature where a lamp takes one.
 */
export function LightColour(props: { lamps: EntityView[] }) {
  const { callService } = useService();

  /** The lamps a change reaches: those in scope that can take it and are on, or all that can when none is. */
  const targets = (can: (e: EntityView) => boolean) => {
    const anyOn = props.lamps.some((e) => e.state === "on");
    return props.lamps.filter((e) => can(e) && (!anyOn || e.state === "on"));
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

  const presets = () => [
    ...WHITES.map((w) => ({ css: w.color, label: w.label, apply: () => sendWhite(w) })),
    ...colours().map(([h, sat]) => ({
      css: hsCss(h, sat),
      label: `Colour ${h}°, ${sat}%`,
      apply: () => sendColour([h, sat]),
    })),
  ];
  const pick = (css: string) => {
    setActive(css);
    setDragged(undefined);
    setDraggedKelvin(undefined);
    presets()
      .find((p) => p.css === css)
      ?.apply();
  };

  const [dragged, setDragged] = createSignal<Color>();
  const lampHs = () =>
    props.lamps.find((e) => takesColour(e) && e.state === "on")?.attributes.hs_color as
      | [number, number]
      | undefined;
  const shownColour = () => {
    const d = dragged();
    if (d) return d;
    const hs = lampHs();
    return parseColor(`hsb(${Math.round(hs?.[0] ?? 36)}, ${Math.round(hs?.[1] ?? 42)}%, 100%)`);
  };
  const endDrag = (c: Color) => {
    setActive(undefined);
    sendColour([Math.round(c.getChannelValue("hue")), Math.round(c.getChannelValue("saturation"))]);
  };

  const [draggedKelvin, setDraggedKelvin] = createSignal<number>();
  const temperatureLamp = () => props.lamps.find((e) => takesTemperature(e) && e.state === "on");
  // A released drag stays shown until the lamp reports back, so the thumb never jumps to the old value.
  createEffect(on(lampHs, () => setDragged(undefined), { defer: true }));
  createEffect(
    on(
      () => temperatureLamp()?.attributes.color_temp_kelvin,
      () => setDraggedKelvin(undefined),
      { defer: true },
    ),
  );
  const kelvin = () =>
    draggedKelvin() ??
    (temperatureLamp()?.attributes.color_temp_kelvin as number | undefined) ??
    2700;
  /** The span the lamps can reach together: the warmest any goes to, the coolest any goes to. */
  const kelvinRange = () => {
    const lamps = props.lamps.filter(takesTemperature);
    const lows = lamps.map((e) => e.attributes.min_color_temp_kelvin as number | undefined);
    const highs = lamps.map((e) => e.attributes.max_color_temp_kelvin as number | undefined);
    const min = Math.min(...lows.filter((v): v is number => typeof v === "number"));
    const max = Math.max(...highs.filter((v): v is number => typeof v === "number"));
    return { min: Number.isFinite(min) ? min : 2000, max: Number.isFinite(max) ? max : 6500 };
  };
  const sendKelvin = (k: number) => {
    setActive(undefined);
    const lamps = targets(takesTemperature);
    if (lamps.length)
      void callService("light", "turn_on", { color_temp_kelvin: k }, { entity_id: ids(lamps) });
  };

  const anyColour = () => props.lamps.some(takesColour);
  const anyTemperature = () => props.lamps.some(takesTemperature);
  const anyWhite = () => props.lamps.some(takesWhite);
  const reach = () => {
    const whiteCapable = props.lamps.filter(takesWhite).length;
    const colourCapable = props.lamps.filter(takesColour).length;
    return colourCapable < whiteCapable
      ? `Colour reaches ${colourCapable} of ${whiteCapable} lamps`
      : undefined;
  };

  return (
    <Show when={anyWhite()}>
      <PanelSection label="Colour">
        <SwatchPicker
          value={active() ?? null}
          colors={presets().map((p) => p.css)}
          labelOf={(_, i) => presets()[i]?.label ?? ""}
          onChange={pick}
          aria-label="Presets"
        />
        <Show when={anyTemperature()}>
          <TemperatureBar
            value={kelvin()}
            min={kelvinRange().min}
            max={kelvinRange().max}
            onChange={setDraggedKelvin}
            onChangeEnd={(k) => {
              setDraggedKelvin(k);
              sendKelvin(k);
            }}
            aria-label="White"
          />
        </Show>
        <Show when={anyColour()}>
          <ColorDisc
            class="mx-auto"
            size={240}
            value={shownColour()}
            onChange={setDragged}
            onChangeEnd={(c) => {
              setDragged(c);
              endDrag(c);
            }}
          />
        </Show>
        <Show when={reach()}>{(line) => <p class="glasshome-panel-label">{line()}</p>}</Show>
      </PanelSection>
    </Show>
  );
}
