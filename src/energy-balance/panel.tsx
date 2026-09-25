import {
  type PanelFact,
  PanelFacts,
  PanelSection,
  ToggleGroup,
  ToggleGroupItem,
  useDaylight,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, createUniqueId, For, onCleanup, onMount, Show } from "solid-js";
import dayArt from "./assets/sky-day.webp";
import duskArt from "./assets/sky-dusk.webp";
import nightArt from "./assets/sky-night.webp";
import { arcPoint, HORIZON, skyProgress, skyScene } from "./sun-path";

const PHOTO = { day: dayArt, dusk: duskArt, night: nightArt };
// The SDK's art box is the stage's bottom 82%, so stage heights shift up by the rest.
const ART_TOP = 0.18;
const ART_H = 0.82;
const SAMPLES = 48;

/** The sun's arc over the photo's horizon, drawn in the stage's art box. */
function SunArc(props: { glow: number }) {
  const daylight = useDaylight();
  const glowId = createUniqueId();
  const [now, setNow] = createSignal(new Date());
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  let svg: SVGSVGElement | undefined;
  onMount(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    });
    if (svg) ro.observe(svg);
    onCleanup(() => {
      clearInterval(id);
      ro.disconnect();
    });
  });
  const position = createMemo(() => {
    const d = daylight();
    return skyProgress(now(), d.phase === "day", d.progress);
  });
  const point = (t: number) => {
    const { width, height } = size();
    const stageH = height / ART_H;
    const { y } = arcPoint(t, { width: 1, height: stageH });
    return { x: width * (0.1 + 0.8 * t), y: y - stageH * ART_TOP };
  };
  const path = (from: number, to: number) => {
    const points: string[] = [];
    for (let i = 0; i <= SAMPLES; i++) {
      const p = point(from + ((to - from) * i) / SAMPLES);
      points.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return `M${points.join("L")}`;
  };
  const body = () => point(position().t);
  const isSun = () => position().body === "sun";

  return (
    <svg ref={svg} width="100%" height="100%" overflow="visible" aria-hidden="true">
      <Show when={size().width > 0}>
        <defs>
          <radialGradient id={glowId}>
            <stop offset="0%" stop-color="oklch(0.95 0.12 85)" stop-opacity="0.9" />
            <stop offset="100%" stop-color="oklch(0.85 0.16 70)" stop-opacity="0" />
          </radialGradient>
        </defs>
        <path
          d={path(0, 1)}
          fill="none"
          stroke="oklch(1 0 0 / 0.45)"
          stroke-width="2"
          stroke-dasharray="2 7"
          stroke-linecap="round"
        />
        <path
          d={path(0, position().t)}
          fill="none"
          stroke={isSun() ? "oklch(0.88 0.15 80 / 0.9)" : "oklch(0.9 0.03 250 / 0.6)"}
          stroke-width="3"
          stroke-linecap="round"
        />
        <Show when={isSun()}>
          <circle cx={body().x} cy={body().y} r={24 + props.glow * 48} fill={`url(#${glowId})`} />
        </Show>
        <circle
          cx={body().x}
          cy={body().y}
          r={isSun() ? 12 : 9}
          fill={isSun() ? "oklch(0.97 0.08 90)" : "oklch(0.95 0.02 250)"}
        />
      </Show>
    </svg>
  );
}

export interface BalanceMode {
  value: string;
  label: string;
}

/** Energy balance, held: the horizon with the sun's arc, the net for the chosen period, and where it went. */
export function EnergyBalancePanel(props: {
  name: string;
  icon: string;
  eyebrow: string;
  value: string;
  unit: string;
  glow: number;
  modes: BalanceMode[];
  mode: string;
  onMode: (mode: string) => void;
  facts: PanelFact[];
  factsLabel: string;
  tone: string;
}) {
  const daylight = useDaylight();
  const scene = () => skyScene(daylight().phase);

  return (
    <WidgetPanel
      icon={props.icon}
      tone={props.tone}
      eyebrow={props.eyebrow}
      name={props.name}
      backdrop={
        <img
          src={PHOTO[scene()]}
          alt=""
          style={{ "object-position": `center ${HORIZON * 100}%` }}
        />
      }
      art={<SunArc glow={props.glow} />}
      value={
        <>
          {props.value}
          <Show when={props.unit}>
            <small>{props.unit}</small>
          </Show>
        </>
      }
      actions={
        <ToggleGroup
          aria-label="Period"
          value={props.mode}
          onChange={(v: string | null) => v && props.onMode(v)}
        >
          <For each={props.modes}>
            {(m) => <ToggleGroupItem value={m.value}>{m.label}</ToggleGroupItem>}
          </For>
        </ToggleGroup>
      }
    >
      <PanelSection label={props.factsLabel}>
        <PanelFacts items={props.facts} />
      </PanelSection>
    </WidgetPanel>
  );
}
