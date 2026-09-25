import {
  Icon,
  PanelFacts,
  PanelSection,
  ToggleGroup,
  ToggleGroupItem,
  WidgetPanel,
  WidgetSizeCtx,
} from "@glasshome/widget-sdk";
import {
  createMemo,
  createSignal,
  For,
  type JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import { AnalogClock, SquareAnalogClock } from "./analog-face";
import { getPresetTheme } from "./presets";
import type { ClockConfig, ClockStyle } from "./types";
import { getClockTones, getTimeParts } from "./utils";

const FACES: { value: ClockStyle; label: string; icon: string }[] = [
  { value: "digital", label: "Digital", icon: "mdi:clock-digital" },
  { value: "analog", label: "Analog", icon: "mdi:clock-outline" },
  { value: "square", label: "Square", icon: "mdi:square-rounded-outline" },
];

function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart) / 86_400_000 + 1) / 7);
}

/** Gives the faces the box they are drawn in, since they size themselves to it. */
function FaceBox(props: { children: JSX.Element }) {
  let el!: HTMLDivElement;
  const [size, setSize] = createSignal({ width: 0, height: 0 });
  onMount(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const side = Math.min(entry.contentRect.width, entry.contentRect.height);
      setSize({ width: side, height: side });
    });
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });
  return (
    <div
      ref={el}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        "align-items": "flex-end",
        "justify-content": "flex-end",
      }}
    >
      <div
        style={{ position: "relative", width: `${size().width}px`, height: `${size().height}px` }}
      >
        <WidgetSizeCtx.Provider value={size}>{props.children}</WidgetSizeCtx.Provider>
      </div>
    </div>
  );
}

/** The clock, held: the chosen face big, today in words, and the other faces one tap away. */
export function ClockPanel(props: {
  config: ClockConfig;
  now: Date;
  onFace: (face: ClockStyle) => void;
}) {
  const digital = () => getPresetTheme(props.config.preset).digital;
  const time = createMemo(() =>
    getTimeParts(props.now, props.config.timeFormat, props.config.timeZone),
  );
  const inZone = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, {
      ...options,
      ...(props.config.timeZone && { timeZone: props.config.timeZone }),
    }).format(props.now);

  const place = () => props.config.timeZone?.split("/").pop()?.replaceAll("_", " ");

  return (
    <WidgetPanel
      icon="mdi:clock-outline"
      tone={getClockTones(props.config.preset).color}
      name={place() ?? "Clock"}
      art={
        <Switch>
          <Match when={props.config.clockStyle === "analog"}>
            <FaceBox>
              <AnalogClock
                date={props.now}
                timeZone={props.config.timeZone}
                size="large"
                maxSize={420}
                showSeconds={props.config.showSeconds}
                preset={props.config.preset}
                analogOptions={props.config.analogOptions}
              />
            </FaceBox>
          </Match>
          <Match when={props.config.clockStyle === "square"}>
            <FaceBox>
              <SquareAnalogClock
                date={props.now}
                timeZone={props.config.timeZone}
                showSeconds={props.config.showSeconds}
                preset={props.config.preset}
                analogOptions={props.config.analogOptions}
                presetTheme={getPresetTheme(props.config.preset).analog}
              />
            </FaceBox>
          </Match>
        </Switch>
      }
      value={
        <Show when={props.config.clockStyle === "digital"}>
          <span
            style={{
              "font-family": digital().fontFamily,
              "font-weight": digital().fontWeight,
              "letter-spacing": digital().letterSpacing,
              "font-variant-numeric": "tabular-nums",
            }}
          >
            {time().hours}:{time().minutes}
            <Show when={props.config.showSeconds}>
              <small>:{time().seconds}</small>
            </Show>
            <Show when={time().period}>
              <small>{time().period}</small>
            </Show>
          </span>
        </Show>
      }
    >
      <PanelSection label="Today">
        <PanelFacts
          items={[
            {
              icon: "mdi:calendar-today",
              label: inZone({ weekday: "long" }),
              value: inZone({ day: "numeric", month: "long" }),
            },
            { icon: "mdi:calendar-week", label: "Week", value: String(isoWeek(props.now)) },
          ]}
        />
      </PanelSection>
      <PanelSection label="Face">
        <ToggleGroup
          aria-label="Face"
          class="w-full"
          tone={getClockTones(props.config.preset).color}
          value={props.config.clockStyle}
          onChange={(face: string | null) => {
            const next = FACES.find((f) => f.value === face);
            if (next) props.onFace(next.value);
          }}
        >
          <For each={FACES}>
            {(face) => (
              <ToggleGroupItem value={face.value} aria-label={face.label}>
                <Icon icon={face.icon} width={18} />
                {face.label}
              </ToggleGroupItem>
            )}
          </For>
        </ToggleGroup>
      </PanelSection>
    </WidgetPanel>
  );
}
