import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  useTranslation,
  WidgetDialog,
  type WidgetDialogProps,
} from "@glasshome/widget-sdk";
import { createSignal, type JSX, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { datePattern } from "./format";
import { type ClockConfig, DATE_FORMATS, TIME_FORMATS } from "./types";

const STYLE_WORDS: Record<string, string> = {
  digital: "clock.dialog.style.digital",
  analog: "clock.dialog.style.analog",
  square: "clock.dialog.style.square-edge",
};
const STYLE_SHORT: Record<string, string> = {
  digital: "clock.dialog.style.digital",
  analog: "clock.dialog.style.analog",
  square: "clock.dialog.style.square",
};
const TIME_WORDS: Record<string, string> = {
  auto: "clock.dialog.time.auto",
  "24": "clock.dialog.time.h24",
  "12": "clock.dialog.time.h12",
};
const DATE_WORDS: Record<string, string> = { auto: "clock.dialog.date.auto" };
const PRESET_WORDS: Record<string, string> = {
  modern: "clock.dialog.preset.modern",
  classic: "clock.dialog.preset.classic",
  minimal: "clock.dialog.preset.minimal",
  bold: "clock.dialog.preset.bold",
};
const LAYOUT_WORDS: Record<string, string> = {
  auto: "clock.dialog.layout.auto-shape",
  horizontal: "clock.dialog.layout.horizontal",
  stacked: "clock.dialog.layout.stacked",
};
const LAYOUT_SHORT: Record<string, string> = {
  auto: "clock.dialog.layout.auto",
  horizontal: "clock.dialog.layout.horizontal",
  stacked: "clock.dialog.layout.stacked",
};
const SIZE_WORDS: Record<string, string> = {
  small: "clock.dialog.size.small",
  medium: "clock.dialog.size.medium",
  large: "clock.dialog.size.large",
};
const TICK_WORDS: Record<string, string> = {
  none: "clock.dialog.ticks.none",
  quarter: "clock.dialog.ticks.quarter",
  hour: "clock.dialog.ticks.hour",
  minute: "clock.dialog.ticks.minute",
};

function Field(props: { label: string; children: JSX.Element }) {
  return (
    <div class="flex flex-col gap-1.5">
      <Label>{props.label}</Label>
      {props.children}
    </div>
  );
}

function Toggle(props: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <div class="flex items-center justify-between">
      <Label>{props.label}</Label>
      <Switch checked={props.checked} onChange={props.onChange} />
    </div>
  );
}

function Choices<V extends string>(props: {
  label: string;
  value: V;
  options: readonly V[];
  words: Record<string, string>;
  short?: Record<string, string>;
  spelled?: (value: string) => string | undefined;
  onChange: (value: V) => void;
}) {
  const { t } = useTranslation();
  const word = (words: Record<string, string>, value: string) =>
    words[value] ? t(words[value]) : (props.spelled?.(value) ?? value);
  const itemWord = (value: string) => word(props.words, value);
  const shownWord = (value: string) => word(props.short ?? props.words, value);
  return (
    <Field label={props.label}>
      <Select
        value={props.value}
        onChange={(value) => {
          if (value) props.onChange(value);
        }}
        options={[...props.options]}
        itemComponent={(item) => (
          <SelectItem item={item.item}>{itemWord(String(item.item.rawValue))}</SelectItem>
        )}
      >
        <SelectTrigger class="w-full">
          <SelectValue<string>>
            {(state) => shownWord(String(state.selectedOption() ?? props.value))}
          </SelectValue>
        </SelectTrigger>
        <SelectContent />
      </Select>
    </Field>
  );
}

const STYLES = ["digital", "analog", "square"] as const;
const PRESETS = ["modern", "classic", "minimal", "bold"] as const;
const LAYOUTS = ["auto", "horizontal", "stacked"] as const;
const SIZES = ["small", "medium", "large"] as const;
const TICKS = ["none", "quarter", "hour", "minute"] as const;

export function ClockDialog(props: {
  config: ClockConfig;
  dialog: Pick<WidgetDialogProps, "open" | "onOpenChange"> & Partial<WidgetDialogProps>;
  onConfigSave: (config: ClockConfig) => void;
}) {
  const tools = useTranslation();
  const { t } = tools;
  const [draft, setDraft] = createSignal<ClockConfig>(props.config);
  const hasChanges = () => JSON.stringify(draft()) !== JSON.stringify(props.config);
  const update = <K extends keyof ClockConfig>(key: K, value: ClockConfig[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));
  const analog = () => draft().analogOptions;

  return (
    <WidgetDialog
      {...widgetDialogProps}
      {...props.dialog}
      onOpenChange={(open) => {
        if (!open) setDraft(props.config);
        props.dialog.onOpenChange(open);
      }}
      title={t("clock.dialog.title")}
      maxWidth="md"
      hasUnsavedChanges={hasChanges()}
      onSave={() => {
        props.onConfigSave(draft());
        props.dialog.onOpenChange(false);
      }}
      editContent={
        <div class="flex flex-col gap-5 text-sm">
          <Choices
            label={t("clock.dialog.style.label")}
            value={draft().clockStyle}
            options={STYLES}
            words={STYLE_WORDS}
            short={STYLE_SHORT}
            onChange={(value) => update("clockStyle", value)}
          />
          <Choices
            label={t("clock.dialog.time.label")}
            value={draft().timeFormat}
            options={TIME_FORMATS}
            words={TIME_WORDS}
            onChange={(value) => update("timeFormat", value)}
          />
          <Toggle
            label={t("clock.dialog.seconds")}
            checked={draft().showSeconds}
            onChange={(checked) => update("showSeconds", checked)}
          />
          <Field label={t("clock.dialog.timezone.label")}>
            <Input
              type="text"
              placeholder={t("clock.dialog.timezone.placeholder")}
              value={draft().timeZone ?? ""}
              onInput={(e) => update("timeZone", e.currentTarget.value || undefined)}
            />
          </Field>
          <Choices
            label={t("clock.dialog.preset.label")}
            value={draft().preset}
            options={PRESETS}
            words={PRESET_WORDS}
            onChange={(value) => update("preset", value)}
          />
          <Show when={draft().clockStyle === "digital"}>
            <Choices
              label={t("clock.dialog.layout.label")}
              value={draft().layout}
              options={LAYOUTS}
              words={LAYOUT_WORDS}
              short={LAYOUT_SHORT}
              onChange={(value) => update("layout", value)}
            />
            <Choices
              label={t("clock.dialog.font-size")}
              value={draft().fontSize}
              options={SIZES}
              words={SIZE_WORDS}
              onChange={(value) => update("fontSize", value)}
            />
          </Show>
          <Toggle
            label={t("clock.dialog.date.show")}
            checked={draft().showDate}
            onChange={(checked) => update("showDate", checked)}
          />
          <Show when={draft().showDate}>
            <Choices
              label={t("clock.dialog.date.label")}
              value={draft().dateFormat}
              options={DATE_FORMATS}
              words={DATE_WORDS}
              spelled={(value) => {
                const format = DATE_FORMATS.find((f) => f === value);
                return format && format !== "auto" ? datePattern(format, tools) : undefined;
              }}
              onChange={(value) => update("dateFormat", value)}
            />
          </Show>
          <Show when={draft().clockStyle !== "digital"}>
            <Show when={draft().clockStyle === "analog"}>
              <Choices
                label={t("clock.dialog.clock-size")}
                value={draft().clockSize}
                options={SIZES}
                words={SIZE_WORDS}
                onChange={(value) => update("clockSize", value)}
              />
            </Show>
            <Toggle
              label={t("clock.dialog.border")}
              checked={analog()?.border ?? false}
              onChange={(border) => update("analogOptions", { ...analog(), border })}
            />
            <Choices
              label={t("clock.dialog.ticks.label")}
              value={analog()?.ticks ?? "hour"}
              options={TICKS}
              words={TICK_WORDS}
              onChange={(ticks) => update("analogOptions", { ...analog(), ticks })}
            />
          </Show>
        </div>
      }
    />
  );
}
