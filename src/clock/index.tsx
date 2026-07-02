import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@glasshome/ui/solid";
import {
  defineWidget,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { AnalogClock, SquareAnalogClock } from "./analog-face";
import { getPresetTheme } from "./presets";
import { configSchema, type ClockConfig } from "./types";
import {
  formatDate,
  getClockGradient,
  getDayOfWeek,
  getDefaultConfig,
  getTimeParts,
} from "./utils";

function ClockWidget(props: { config: ClockConfig }) {
  const defaults = getDefaultConfig();
  const cfg = createMemo(() => ({ ...defaults, ...props.config }));

  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  // Draft state for dialog edits
  const [draftConfig, setDraftConfig] = createSignal<ClockConfig>(cfg());
  const hasChanges = () => JSON.stringify(draftConfig()) !== JSON.stringify(cfg());

  // Time state
  const [currentTime, setCurrentTime] = createSignal(new Date());

  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  onCleanup(() => clearInterval(timer));

  const presetTheme = createMemo(() => getPresetTheme(cfg().preset));
  const gradient = createMemo(() => getClockGradient(cfg().preset));

  const timeParts = createMemo(() => getTimeParts(currentTime(), cfg().timeFormat, cfg().timeZone));
  const formattedDate = createMemo(() =>
    formatDate(currentTime(), cfg().dateFormat, cfg().timeZone),
  );
  const dayOfWeek = createMemo(() => getDayOfWeek(currentTime(), cfg().timeZone));

  // Live minute-progress: drives the sweeping bottom bar (digital only).
  const secondsNum = createMemo(() => Number.parseInt(timeParts().seconds, 10) || 0);
  const secondsProgress = createMemo(() => (secondsNum() / 60) * 100);
  // Single accent drives the live seconds bar — same palette as the analog/square faces.
  const barColor = () => "var(--tone-accent)";

  // Responsive font classes
  const timeClasses = () => {
    switch (cfg().fontSize) {
      case "small":
        return "text-3xl @[150px]:text-4xl @[250px]:text-5xl @[350px]:text-6xl";
      case "large":
        return "text-5xl @[150px]:text-6xl @[250px]:text-7xl @[350px]:text-8xl";
      default:
        return "text-4xl @[150px]:text-5xl @[250px]:text-6xl @[350px]:text-7xl";
    }
  };

  const secondsClasses = () => {
    switch (cfg().fontSize) {
      case "small":
        return "text-lg @[150px]:text-xl @[250px]:text-2xl @[350px]:text-3xl";
      case "large":
        return "text-2xl @[150px]:text-3xl @[250px]:text-4xl @[350px]:text-5xl";
      default:
        return "text-xl @[150px]:text-2xl @[250px]:text-3xl @[350px]:text-4xl";
    }
  };

  const dayClasses = () => {
    switch (cfg().fontSize) {
      case "small":
        return "text-[10px] @[200px]:text-xs tracking-[0.2em]";
      case "large":
        return "text-sm @[200px]:text-base tracking-[0.3em]";
      default:
        return "text-xs @[200px]:text-sm tracking-[0.25em]";
    }
  };

  const dateClasses = () => {
    switch (cfg().fontSize) {
      case "small":
        return "text-[10px] @[200px]:text-xs";
      case "large":
        return "text-sm @[200px]:text-base";
      default:
        return "text-xs @[200px]:text-sm";
    }
  };

  // Preset presence gates the glow (minimal stays flat); the accent tone paints it.
  const glowStyle = createMemo(() => {
    if (!presetTheme().digital.glowColor) return {};
    const glow = "var(--tone-accent)";
    return { "text-shadow": `0 0 20px ${glow}, 0 0 40px ${glow}, 0 0 60px ${glow}` };
  });

  const gestures = useWidgetGestures(
    () => ({ hold: { action: openDialog } }),
  );
  onCleanup(gestures.dispose);

  const digital = () => presetTheme().digital;

  // Closure component: renders inside <Widget>, so it sees the real measured
  // context. The top-level widget scope only gets the stub whose dimensions()
  // is always (0,0), which froze "auto" layout on horizontal.
  const DigitalTime = () => {
    const innerCtx = useWidgetContext();
    const effectiveLayout = createMemo(() => {
      const layout = cfg().layout;
      if (layout === "auto") {
        const d = innerCtx.dimensions();
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
              class={`font-bold tabular-nums ${timeClasses()} text-foreground`}
              style={{
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                "letter-spacing": digital().letterSpacing,
                "line-height": "0.9",
                ...glowStyle(),
              }}
            >
              {timeParts().hours}
            </div>
            <div
              class={`font-bold tabular-nums opacity-70 ${timeClasses()} text-foreground`}
              style={{
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                "letter-spacing": digital().letterSpacing,
                "line-height": "0.9",
                ...glowStyle(),
              }}
            >
              {timeParts().minutes}
            </div>
            <Show when={cfg().showSeconds}>
              <div class="@[200px]:mt-2 mt-1 flex items-center gap-1">
                <div
                  class={`font-bold tabular-nums ${secondsClasses()}`}
                  style={{
                    "font-family": digital().fontFamily,
                    "font-weight": digital().fontWeight,
                    color: "var(--tone-accent)",
                  }}
                >
                  {timeParts().seconds}
                </div>
                <span
                  class={`font-medium @[200px]:text-xs text-[10px] uppercase opacity-50 text-foreground`}
                >
                  sec
                </span>
              </div>
            </Show>
            <Show when={timeParts().period && !cfg().showSeconds}>
              <span
                class={`mt-1 font-medium @[200px]:text-sm text-xs opacity-50 text-foreground`}
              >
                {timeParts().period}
              </span>
            </Show>
          </div>
        }
      >
        {/* Horizontal layout (default) */}
        <div class="flex items-baseline justify-center gap-0.5">
          <div
            class={`font-bold tabular-nums ${timeClasses()} text-foreground`}
            style={{
              "font-family": digital().fontFamily,
              "font-weight": digital().fontWeight,
              "letter-spacing": digital().letterSpacing,
              ...glowStyle(),
            }}
          >
            {timeParts().hours}
            <span class="mx-0.5 opacity-60">:</span>
            {timeParts().minutes}
          </div>

          <Show when={cfg().showSeconds}>
            <div
              class={`mb-[0.1em] self-end font-bold tabular-nums ${secondsClasses()}`}
              style={{
                "font-family": digital().fontFamily,
                "font-weight": digital().fontWeight,
                color: "var(--tone-accent)",
              }}
            >
              :{timeParts().seconds}
            </div>
          </Show>

          <Show when={timeParts().period}>
            <span
              class={`mt-[0.2em] ml-1 self-start font-medium @[200px]:text-sm text-xs opacity-50 text-foreground`}
            >
              {timeParts().period}
            </span>
          </Show>
        </div>
      </Show>
    );
  };

  // Draft update helper
  const updateDraft = <K extends keyof ClockConfig>(key: K, value: ClockConfig[K]) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  // Day + date. Uniform foreground palette across all three faces.
  const DateBlock = () => (
    <div class="@[200px]:gap-1 flex flex-col items-center gap-0.5">
      <span class={`font-medium text-foreground/60 ${dayClasses()}`}>{dayOfWeek()}</span>
      <span class={`text-foreground opacity-50 ${dateClasses()}`}>{formattedDate()}</span>
    </div>
  );

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" gradient={gradient()}>
        <div class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
          {/* Square face fills the widget; ticks ride its edges */}
          <Show when={cfg().clockStyle === "square"}>
            <SquareAnalogClock
              date={currentTime()}
              timeZone={cfg().timeZone}
              showSeconds={cfg().showSeconds}
              preset={cfg().preset}
              analogOptions={cfg().analogOptions}
              presetTheme={presetTheme().analog}
            />
            <Show when={cfg().showDate}>
              <div class="pointer-events-none absolute inset-x-0 top-[58%] flex justify-center">
                <DateBlock />
              </div>
            </Show>
          </Show>

          {/* Centered clock display (digital + round analog) */}
          <Show when={cfg().clockStyle !== "square"}>
            <div class="flex flex-col items-center justify-center">
              <Show
                when={cfg().clockStyle !== "analog"}
                fallback={
                  <AnalogClock
                    date={currentTime()}
                    timeZone={cfg().timeZone}
                    size={cfg().clockSize}
                    showSeconds={cfg().showSeconds}
                    preset={cfg().preset}
                    analogOptions={cfg().analogOptions}
                  />
                }
              >
                <DigitalTime />
              </Show>

              <Show when={cfg().showDate}>
                <div class="@[200px]:mt-3 mt-2">
                  <DateBlock />
                </div>
              </Show>
            </div>
          </Show>

          {/* Ambient glow effect */}
          <Show when={digital().glowColor && cfg().clockStyle === "digital"}>
            <div
              class="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
              style={{ "background-color": "var(--tone-accent)" }}
            />
          </Show>

          {/* Live minute-progress bar — sweeps each minute, snaps on the wrap */}
          <Show when={cfg().clockStyle === "digital"}>
            <div class="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] overflow-hidden">
              <div
                class={`clock-seconds-fill h-full origin-left rounded-full${secondsNum() === 0 ? " snap" : ""}`}
                style={{
                  transform: `scaleX(${secondsProgress() / 100})`,
                  background: `linear-gradient(90deg, transparent, ${barColor()})`,
                }}
              />
            </div>
          </Show>

          <style>{`
            .clock-seconds-fill { width: 100%; transition: transform 1000ms linear; will-change: transform; }
            .clock-seconds-fill.snap { transition: none; }
            @media (prefers-reduced-motion: reduce) {
              .clock-seconds-fill { transition: none; }
            }
          `}</style>
        </div>
      </Widget>

      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        onOpenChange={(open) => {
          if (!open) setDraftConfig(cfg());
          setShowDialog(open);
        }}
        title="Clock"
        maxWidth="md"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig(draftConfig() as unknown as Record<string, unknown>);
          setShowDialog(false);
        }}
        editContent={
          <div class="flex flex-col gap-5 text-sm">
            {/* Clock Style */}
            <div class="flex flex-col gap-1.5">
              <Label>Clock Style</Label>
              <Select
                value={draftConfig().clockStyle}
                onChange={(val) => {
                  if (val) updateDraft("clockStyle", val as ClockConfig["clockStyle"]);
                }}
                options={["digital", "analog", "square"]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {{ digital: "Digital", analog: "Analog", square: "Square (edge ticks)" }[
                      itemProps.item.rawValue as string
                    ] ?? itemProps.item.rawValue}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full">
                  <SelectValue<string>>
                    {(state) =>
                      ({ digital: "Digital", analog: "Analog", square: "Square" })[
                        state.selectedOption() as string
                      ] ?? state.selectedOption()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            {/* Time Format */}
            <div class="flex flex-col gap-1.5">
              <Label>Time Format</Label>
              <Select
                value={draftConfig().timeFormat}
                onChange={(val) => {
                  if (val) updateDraft("timeFormat", val as "12" | "24");
                }}
                options={["24", "12"]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue === "24" ? "24-hour" : "12-hour"}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full">
                  <SelectValue<string>>
                    {(state) => (state.selectedOption() === "24" ? "24-hour" : "12-hour")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            {/* Show Seconds */}
            <div class="flex items-center justify-between">
              <Label>Show Seconds</Label>
              <Switch
                checked={draftConfig().showSeconds}
                onChange={(checked) => updateDraft("showSeconds", checked)}
              />
            </div>

            {/* Timezone */}
            <div class="flex flex-col gap-1.5">
              <Label>Timezone</Label>
              <Input
                type="text"
                placeholder="e.g. America/New_York (leave empty for local)"
                value={draftConfig().timeZone ?? ""}
                onInput={(e) => updateDraft("timeZone", e.currentTarget.value || undefined)}
              />
            </div>

            {/* Preset */}
            <div class="flex flex-col gap-1.5">
              <Label>Theme Preset</Label>
              <Select
                value={draftConfig().preset}
                onChange={(val) => {
                  if (val) updateDraft("preset", val as ClockConfig["preset"]);
                }}
                options={["modern", "classic", "minimal", "bold"]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {{
                      modern: "Modern",
                      classic: "Classic",
                      minimal: "Minimal",
                      bold: "Bold",
                    }[itemProps.item.rawValue as string] ?? itemProps.item.rawValue}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full">
                  <SelectValue<string>>
                    {(state) =>
                      ({
                        modern: "Modern",
                        classic: "Classic",
                        minimal: "Minimal",
                        bold: "Bold",
                      })[state.selectedOption() as string] ?? state.selectedOption()
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent />
              </Select>
            </div>

            {/* Digital-specific options */}
            <Show when={draftConfig().clockStyle === "digital"}>
              {/* Layout */}
              <div class="flex flex-col gap-1.5">
                <Label>Layout</Label>
                <Select
                  value={draftConfig().layout}
                  onChange={(val) => {
                    if (val) updateDraft("layout", val as ClockConfig["layout"]);
                  }}
                  options={["auto", "horizontal", "stacked"]}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {{
                        auto: "Auto (based on widget shape)",
                        horizontal: "Horizontal",
                        stacked: "Stacked",
                      }[itemProps.item.rawValue as string] ?? itemProps.item.rawValue}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) =>
                        ({
                          auto: "Auto",
                          horizontal: "Horizontal",
                          stacked: "Stacked",
                        })[state.selectedOption() as string] ?? state.selectedOption()
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>

              {/* Font Size */}
              <div class="flex flex-col gap-1.5">
                <Label>Font Size</Label>
                <Select
                  value={draftConfig().fontSize}
                  onChange={(val) => {
                    if (val) updateDraft("fontSize", val as ClockConfig["fontSize"]);
                  }}
                  options={["small", "medium", "large"]}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {{
                        small: "Small",
                        medium: "Medium",
                        large: "Large",
                      }[itemProps.item.rawValue as string] ?? itemProps.item.rawValue}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) =>
                        ({
                          small: "Small",
                          medium: "Medium",
                          large: "Large",
                        })[state.selectedOption() as string] ?? state.selectedOption()
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>

            </Show>

            {/* Show Date — shared between digital and analogue */}
            <div class="flex items-center justify-between">
              <Label>Show Date</Label>
              <Switch
                checked={draftConfig().showDate}
                onChange={(checked) => updateDraft("showDate", checked)}
              />
            </div>

            {/* Date Format */}
            <Show when={draftConfig().showDate}>
              <div class="flex flex-col gap-1.5">
                <Label>Date Format</Label>
                <Select
                  value={draftConfig().dateFormat}
                  onChange={(val) => {
                    if (val) updateDraft("dateFormat", val as ClockConfig["dateFormat"]);
                  }}
                  options={["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"]}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {String(itemProps.item.rawValue)}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            </Show>

            {/* Analog + square options */}
            <Show when={draftConfig().clockStyle !== "digital"}>
              {/* Clock Size — only the round analog face has a fixed size */}
              <Show when={draftConfig().clockStyle === "analog"}>
              <div class="flex flex-col gap-1.5">
                <Label>Clock Size</Label>
                <Select
                  value={draftConfig().clockSize}
                  onChange={(val) => {
                    if (val) updateDraft("clockSize", val as ClockConfig["clockSize"]);
                  }}
                  options={["small", "medium", "large"]}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {{
                        small: "Small",
                        medium: "Medium",
                        large: "Large",
                      }[itemProps.item.rawValue as string] ?? itemProps.item.rawValue}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) =>
                        ({
                          small: "Small",
                          medium: "Medium",
                          large: "Large",
                        })[state.selectedOption() as string] ?? state.selectedOption()
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
              </Show>

              {/* Border */}
              <div class="flex items-center justify-between">
                <Label>Show Border</Label>
                <Switch
                  checked={draftConfig().analogOptions?.border ?? false}
                  onChange={(checked) =>
                    updateDraft("analogOptions", {
                      ...draftConfig().analogOptions,
                      border: checked,
                    })
                  }
                />
              </div>

              {/* Tick Marks */}
              <div class="flex flex-col gap-1.5">
                <Label>Tick Marks</Label>
                <Select
                  value={draftConfig().analogOptions?.ticks ?? "hour"}
                  onChange={(val) => {
                    if (val)
                      updateDraft("analogOptions", {
                        ...draftConfig().analogOptions,
                        ticks: val as "none" | "quarter" | "hour" | "minute",
                      });
                  }}
                  options={["none", "quarter", "hour", "minute"]}
                  itemComponent={(itemProps) => (
                    <SelectItem item={itemProps.item}>
                      {{
                        none: "None",
                        quarter: "Quarter hours",
                        hour: "Hours",
                        minute: "Minutes",
                      }[itemProps.item.rawValue as string] ?? itemProps.item.rawValue}
                    </SelectItem>
                  )}
                >
                  <SelectTrigger class="w-full">
                    <SelectValue<string>>
                      {(state) =>
                        ({
                          none: "None",
                          quarter: "Quarter hours",
                          hour: "Hours",
                          minute: "Minutes",
                        })[state.selectedOption() as string] ?? state.selectedOption()
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent />
                </Select>
              </div>
            </Show>
          </div>
        }
      />
    </>
  );
}

export default defineWidget<ClockConfig>({
  manifest: {
    name: "Clock",
    description: "Display current time with digital or analog styles, presets, and date",
    icon: "mdi:clock-outline",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
  },
  configSchema,
  component: ClockWidget,
});
