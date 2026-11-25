import {
  defineWidget,
  useTranslation,
  useWidgetContext,
  useWidgetDialog,
  useWidgetDimensions,
  Widget,
  zonedTime,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, type JSX, onCleanup, Show } from "solid-js";
import { AnalogClock, SquareAnalogClock } from "./analog-face";
import { ClockDialog } from "./dialog";
import { clockFace } from "./format";
import en from "./locales/en.json";
import { migrateClock } from "./migrate";
import { getPresetTheme } from "./presets";
import { type ClockConfig, configSchema } from "./types";
import { getClockTones, getDefaultConfig } from "./utils";

function ClockWidget(props: { config: ClockConfig }) {
  const defaults = getDefaultConfig();
  const cfg = createMemo(() => ({ ...defaults, ...props.config }));

  const ctx = useWidgetContext();
  const { dialogProps } = useWidgetDialog();

  // Time state
  const [currentTime, setCurrentTime] = createSignal(new Date());

  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  onCleanup(() => clearInterval(timer));

  const presetTheme = createMemo(() => getPresetTheme(cfg().preset));
  const tones = createMemo(() => getClockTones(cfg().preset));

  const tools = useTranslation();
  const face = createMemo(() => clockFace(currentTime(), cfg(), tools));

  const secondsNum = createMemo(() => zonedTime(currentTime(), cfg().timeZone).second);
  const secondsProgress = createMemo(() => (secondsNum() / 60) * 100);
  // Single accent drives the live seconds bar — same palette as the analog/square faces.
  const barColor = () => "var(--primary)";

  // Sizes follow the tile, so a big clock keeps filling it; the setting scales them together.
  const SCALE = { small: 0.8, medium: 1, large: 1.2 } as const;
  const k = () => SCALE[cfg().fontSize as keyof typeof SCALE] ?? 1;
  const timeSize = (stacked: boolean) =>
    `calc(${k()} * clamp(28px, ${stacked ? "min(34cqi, 26cqb)" : "min(19cqi, 40cqb)"}, 420px))`;
  const secondsSize = (stacked: boolean) => `calc(0.45 * ${timeSize(stacked)})`;
  const metaSize = () => `calc(${k()} * var(--widget-text-sub))`;

  const digital = () => presetTheme().digital;

  // Closure component: renders inside <Widget>, where useWidgetDimensions
  // sees real measurements (it throws in the top-level widget scope, which
  // once froze "auto" layout on horizontal via the (0,0) stub).
  const DigitalTime = () => {
    const dimensions = useWidgetDimensions();
    const effectiveLayout = createMemo(() => {
      const layout = cfg().layout;
      if (layout === "auto") {
        const d = dimensions();
        return d.height > d.width ? "stacked" : "horizontal";
      }
      return layout;
    });

    return (
      <Show
        when={effectiveLayout() !== "stacked"}
        fallback={
          /* Stacked layout */
          <div class="flex flex-col items-center justify-center leading-none">
            <div
              class="text-foreground font-bold tabular-nums"
              style={{
                "font-size": timeSize(true),
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                "letter-spacing": digital().letterSpacing,
                "line-height": "0.9",
              }}
            >
              {face().hours}
            </div>
            <div
              class="text-foreground font-bold tabular-nums opacity-70"
              style={{
                "font-size": timeSize(true),
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                "letter-spacing": digital().letterSpacing,
                "line-height": "0.9",
              }}
            >
              {face().minutes}
            </div>
            <Show when={cfg().showSeconds}>
              <div class="mt-1 flex items-center gap-1 @[200px]:mt-2">
                <div
                  class="font-bold tabular-nums"
                  style={{
                    "font-size": secondsSize(true),
                    "font-family": digital().fontFamily,
                    "font-weight": digital().fontWeight,
                    color: "var(--primary)",
                  }}
                >
                  {face().seconds}
                </div>
                <span class="text-foreground text-[10px] font-medium opacity-50 @[200px]:text-xs">
                  {tools.t("clock.face.seconds-unit")}
                </span>
              </div>
            </Show>
            <Show when={face().period && !cfg().showSeconds}>
              <span class={"text-foreground mt-1 text-xs font-medium opacity-50 @[200px]:text-sm"}>
                {face().period}
              </span>
            </Show>
          </div>
        }
      >
        {/* Horizontal layout (default) */}
        <div class="flex items-baseline justify-center gap-0.5">
          <div
            class="text-foreground font-bold tabular-nums"
            style={{
              "font-size": timeSize(false),
              "font-family": digital().fontFamily,
              "font-weight": digital().fontWeight,
              "letter-spacing": digital().letterSpacing,
            }}
          >
            {face().hours}
            <span class="mx-0.5">:</span>
            {face().minutes}
          </div>

          <Show when={cfg().showSeconds}>
            <div
              class="mb-[0.1em] self-end font-bold tabular-nums"
              style={{
                "font-size": secondsSize(false),
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                color: "var(--primary)",
              }}
            >
              :{face().seconds}
            </div>
          </Show>

          <Show when={face().period}>
            <span
              class={
                "text-foreground mt-[0.2em] ml-1 self-start text-xs font-medium opacity-50 @[200px]:text-sm"
              }
            >
              {face().period}
            </span>
          </Show>
        </div>
      </Show>
    );
  };

  // One grid row is too short for the stacked face; time left, meta right.
  const BannerFace = () => (
    <div class="flex items-center justify-center gap-3 leading-none">
      <div
        class="text-foreground font-bold tabular-nums"
        style={{
          "font-size": "clamp(20px, min(48cqb, 17cqi), 34px)",
          "font-family": digital().fontFamily,
          "font-weight": digital().fontWeight,
          "letter-spacing": digital().letterSpacing,
        }}
      >
        {face().hours}
        <span class="mx-0.5">:</span>
        {face().minutes}
        <Show when={face().period}>
          <span class="text-foreground ml-1 text-xs font-medium opacity-50">{face().period}</span>
        </Show>
      </div>
      <Show when={cfg().showDate}>
        <span class="text-foreground/50 hidden text-[11px] @[240px]:inline">{face().date}</span>
      </Show>
    </div>
  );

  const DigitalFace = () => (
    <>
      <DigitalTime />
      <Show when={cfg().showDate}>
        <div class="mt-2 @[200px]:mt-3">
          <DateBlock />
        </div>
      </Show>
    </>
  );

  // Square face fills the widget; the date sits under the 12, only where it clears the hub.
  const SquareFace = () => {
    const dimensions = useWidgetDimensions();
    return (
      <>
        <SquareAnalogClock
          date={currentTime()}
          timeZone={cfg().timeZone}
          showSeconds={cfg().showSeconds}
          preset={cfg().preset}
          analogOptions={cfg().analogOptions}
          presetTheme={presetTheme().analog}
        />
        <Show when={cfg().showDate && dimensions().height >= 200}>
          <div class="pointer-events-none absolute inset-x-0 top-[24%] flex justify-center">
            <DateBlock />
          </div>
        </Show>
      </>
    );
  };

  // A wide, short box sets the date beside the dial instead of under it.
  const AnalogFace = () => {
    const dimensions = useWidgetDimensions();
    const beside = () => cfg().showDate && dimensions().width > dimensions().height * 1.5;
    return (
      <div class={`flex items-center justify-center ${beside() ? "flex-row gap-5" : "flex-col"}`}>
        <AnalogClock
          date={currentTime()}
          timeZone={cfg().timeZone}
          size={cfg().clockSize}
          reserve={cfg().showDate && !beside() ? 48 : 0}
          reserveX={beside() ? 110 : 0}
          showSeconds={cfg().showSeconds}
          preset={cfg().preset}
          analogOptions={cfg().analogOptions}
        />
        <Show when={cfg().showDate}>
          <div class={beside() ? "" : "mt-2 @[200px]:mt-3"}>
            <DateBlock />
          </div>
        </Show>
      </div>
    );
  };

  // One grid row fits no dial; every style reads as the banner there.
  const ShortOrFull = (p: { children: JSX.Element }) => {
    const dimensions = useWidgetDimensions();
    const short = () => {
      const h = dimensions().height;
      return h > 0 && h < 96;
    };
    return (
      <Show when={!short()} fallback={<BannerFace />}>
        {p.children}
      </Show>
    );
  };

  // Day + date. Uniform foreground palette across all three faces.
  const DateBlock = () => (
    <div class="flex flex-col items-center gap-0.5 @[200px]:gap-1">
      <Show when={cfg().showDate}>
        <span class="text-foreground/60 font-medium" style={{ "font-size": metaSize() }}>
          {face().weekday}
        </span>
        <span class="text-foreground opacity-50" style={{ "font-size": metaSize() }}>
          {face().date}
        </span>
      </Show>
    </div>
  );

  return (
    <>
      <Widget variant="classic-glass" color={tones().color} colorTo={tones().colorTo}>
        <div class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
          <ShortOrFull>
            <Show when={cfg().clockStyle === "square"}>
              <SquareFace />
            </Show>

            <Show when={cfg().clockStyle === "digital"}>
              <div class="flex flex-col items-center justify-center">
                <DigitalFace />
              </div>
            </Show>
            <Show when={cfg().clockStyle === "analog"}>
              <AnalogFace />
            </Show>
          </ShortOrFull>

          {/* Minute-progress bar: sweeps while the host's motion window is open, steps once a second after */}
          <Show when={cfg().clockStyle === "digital"}>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
              <div
                class="clock-seconds-fill h-full origin-left rounded-full"
                classList={{ snap: secondsNum() === 0 }}
                style={{
                  transform: `scaleX(${secondsProgress() / 100})`,
                  background: `linear-gradient(90deg, transparent, ${barColor()})`,
                }}
              />
            </div>
          </Show>

          <style>{`
            .clock-seconds-fill { width: 100%; transition: transform calc(var(--motion-ambient, 0) * 1000ms) linear; }
            .clock-seconds-fill.snap { transition: none; }
            @media (prefers-reduced-motion: reduce) {
              .clock-seconds-fill { transition: none; }
            }
          `}</style>
        </div>
      </Widget>

      <ClockDialog
        config={cfg()}
        dialog={dialogProps}
        onConfigSave={(config) => ctx.updateConfig(config as unknown as Record<string, unknown>)}
      />
    </>
  );
}

export default defineWidget<ClockConfig>({
  messages: en,
  manifest: {
    configVersion: 2,
    name: "Clock",
    description: "Display current time with digital or analog styles, presets, and date",
    icon: "mdi:clock-outline",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Digital",
        size: { w: 2, h: 1 },
        config: {
          clockStyle: "digital",
          clockSize: "medium",
          showSeconds: false,
          timeFormat: "auto",
          preset: "modern",
          showDate: true,
          dateFormat: "auto",
          fontSize: "medium",
          layout: "auto",
          analogOptions: { border: false, ticks: "hour" },
        },
      },
      {
        label: "Analog",
        size: { w: 2, h: 2 },
        config: {
          clockStyle: "analog",
          clockSize: "large",
          showSeconds: true,
          timeFormat: "auto",
          preset: "classic",
          showDate: false,
          dateFormat: "auto",
          fontSize: "medium",
          layout: "auto",
          analogOptions: { border: true, ticks: "hour" },
        },
      },
      {
        label: "Square",
        size: { w: 2, h: 2 },
        config: {
          clockStyle: "square",
          clockSize: "large",
          showSeconds: false,
          timeFormat: "auto",
          preset: "bold",
          showDate: true,
          dateFormat: "auto",
          fontSize: "large",
          layout: "stacked",
          analogOptions: { border: false, ticks: "hour" },
        },
      },
      {
        label: "Digital, large",
        size: { w: 4, h: 2 },
        config: {
          clockStyle: "digital",
          showSeconds: true,
          timeFormat: "auto",
          preset: "modern",
          showDate: true,
          fontSize: "medium",
          layout: "auto",
          clockSize: "medium",
          dateFormat: "auto",
          analogOptions: { border: false, ticks: "hour" },
        },
      },
      {
        label: "Stacked",
        size: { w: 2, h: 3 },
        config: {
          clockStyle: "digital",
          showSeconds: false,
          timeFormat: "auto",
          preset: "modern",
          showDate: true,
          fontSize: "large",
          layout: "stacked",
          clockSize: "medium",
          dateFormat: "auto",
          analogOptions: { border: false, ticks: "hour" },
        },
      },
      {
        label: "12-hour",
        size: { w: 3, h: 1 },
        config: {
          clockStyle: "digital",
          showSeconds: false,
          timeFormat: "12",
          preset: "modern",
          showDate: true,
          fontSize: "medium",
          layout: "auto",
          clockSize: "medium",
          dateFormat: "auto",
          analogOptions: { border: false, ticks: "hour" },
        },
      },
      {
        label: "Analog, large",
        size: { w: 4, h: 4 },
        config: {
          clockStyle: "analog",
          clockSize: "large",
          showSeconds: true,
          timeFormat: "auto",
          preset: "classic",
          showDate: false,
          dateFormat: "auto",
          fontSize: "medium",
          layout: "auto",
          analogOptions: { border: true, ticks: "minute" },
        },
      },
    ],
  },
  configSchema,
  migrate: migrateClock,
  component: ClockWidget,
});
