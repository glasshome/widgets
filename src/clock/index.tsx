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
import { AnalogClock } from "./analog-face";
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
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  // Draft state for dialog edits
  const [draftConfig, setDraftConfig] = createSignal<ClockConfig>(cfg());
  const hasChanges = () => JSON.stringify(draftConfig()) !== JSON.stringify(cfg());

  // Time state
  const [currentTime, setCurrentTime] = createSignal(new Date());

  const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  onCleanup(() => clearInterval(timer));

  const presetTheme = createMemo(() => getPresetTheme(cfg().preset));
  const gradientConfig = createMemo(() => getClockGradient(cfg().preset));
  const gradient = () => `bg-gradient-to-br ${gradientConfig().from} ${gradientConfig().to}`;

  const effectiveLayout = createMemo(() => {
    const layout = cfg().layout;
    if (layout === "auto") {
      return ctx.orientation() === "vertical" ? "stacked" : "horizontal";
    }
    return layout;
  });

  const timeParts = createMemo(() => getTimeParts(currentTime(), cfg().timeFormat, cfg().timeZone));
  const formattedDate = createMemo(() =>
    formatDate(currentTime(), cfg().dateFormat, cfg().timeZone),
  );
  const dayOfWeek = createMemo(() => getDayOfWeek(currentTime(), cfg().timeZone));

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

  const glowStyle = createMemo(() => {
    const glow = presetTheme().digital.glowColor;
    if (!glow) return {};
    return { "text-shadow": `0 0 20px ${glow}, 0 0 40px ${glow}, 0 0 60px ${glow}` };
  });

  const gestures = useWidgetGestures(
    () => ({ hold: { action: openDialog, delay: 300 } }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const digital = () => presetTheme().digital;

  // Draft update helper
  const updateDraft = <K extends keyof ClockConfig>(key: K, value: ClockConfig[K]) => {
    setDraftConfig((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <>
      <div
        class="h-full w-full"
        on:pointerenter={gestures.onPointerEnter}
        on:pointerdown={gestures.onPointerDown}
        on:pointermove={gestures.onPointerMove}
        on:pointerup={gestures.onPointerUp}
        on:pointercancel={gestures.onPointerCancel}
      >
        <Widget variant="classic-glass" gradient={gradient()}>
          <div class="relative flex h-full w-full flex-col items-center justify-center overflow-hidden">
            {/* Clock display */}
            <div class="flex flex-col items-center justify-center">
              <Show
                when={cfg().clockStyle !== "analog"}
                fallback={
                  <AnalogClock
                    date={currentTime()}
                    timeZone={cfg().timeZone}
                    size={cfg().clockSize}
                    showSeconds={cfg().showSeconds}
                    analogOptions={cfg().analogOptions}
                    presetTheme={presetTheme().analog}
                  />
                }
              >
                <Show
                  when={effectiveLayout() !== "stacked"}
                  fallback={
                    /* Stacked layout */
                    <div class="flex flex-col items-center justify-center leading-none">
                      <div
                        class={`font-bold tabular-nums ${timeClasses()} ${digital().textColor}`}
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
                        class={`font-bold tabular-nums opacity-70 ${timeClasses()} ${digital().textColor}`}
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
                            class={`font-bold tabular-nums ${secondsClasses()} ${digital().secondsColor || digital().textColor}`}
                            style={{
                              "font-family": digital().fontFamily,
                              "font-weight": digital().fontWeight,
                            }}
                          >
                            {timeParts().seconds}
                          </div>
                          <span
                            class={`font-medium @[200px]:text-xs text-[10px] uppercase opacity-50 ${digital().textColor}`}
                          >
                            sec
                          </span>
                        </div>
                      </Show>
                      <Show when={timeParts().period && !cfg().showSeconds}>
                        <span
                          class={`mt-1 font-medium @[200px]:text-sm text-xs opacity-50 ${digital().textColor}`}
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
                      class={`font-bold tabular-nums ${timeClasses()} ${digital().textColor}`}
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
                        class={`mb-[0.1em] self-end font-bold tabular-nums ${secondsClasses()} ${digital().secondsColor || digital().textColor}`}
                        style={{
                          "font-family": digital().fontFamily,
                          "font-weight": digital().fontWeight,
                        }}
                      >
                        :{timeParts().seconds}
                      </div>
                    </Show>

                    <Show when={timeParts().period}>
                      <span
                        class={`mt-[0.2em] ml-1 self-start font-medium @[200px]:text-sm text-xs opacity-50 ${digital().textColor}`}
                      >
                        {timeParts().period}
                      </span>
                    </Show>
                  </div>
                </Show>

                {/* Date display */}
                <Show when={cfg().showDate}>
                  <div class="@[200px]:mt-3 mt-2 flex flex-col items-center @[200px]:gap-1 gap-0.5">
                    <span
                      class={`font-medium ${dayClasses()} ${digital().dayColor || "text-foreground/60"}`}
                      style={{ "font-family": digital().fontFamily }}
                    >
                      {dayOfWeek()}
                    </span>
                    <span
                      class={`opacity-50 ${dateClasses()} ${digital().textColor}`}
                      style={{ "font-family": digital().fontFamily }}
                    >
                      {formattedDate()}
                    </span>
                  </div>
                </Show>
              </Show>
            </div>

            {/* Ambient glow effect */}
            <Show when={digital().glowColor && cfg().clockStyle === "digital"}>
              <div
                class="pointer-events-none absolute inset-0 -z-10 opacity-30 blur-3xl"
                style={{ "background-color": digital().glowColor }}
              />
            </Show>
          </div>
        </Widget>
      </div>

      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
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
                options={["digital", "analog"]}
                itemComponent={(itemProps) => (
                  <SelectItem item={itemProps.item}>
                    {itemProps.item.rawValue === "digital" ? "Digital" : "Analog"}
                  </SelectItem>
                )}
              >
                <SelectTrigger class="w-full">
                  <SelectValue<string>>
                    {(state) => (state.selectedOption() === "digital" ? "Digital" : "Analog")}
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

              {/* Show Date */}
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
            </Show>

            {/* Analog-specific options */}
            <Show when={draftConfig().clockStyle === "analog"}>
              {/* Clock Size */}
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
    sdkVersion: "^0.2.0",
  },
  configSchema,
  component: ClockWidget,
});
