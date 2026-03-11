import { defineWidget } from "@glasshome/widget-sdk";
import { type Component, createEffect, createSignal, onCleanup, Show } from "solid-js";
import { AnalogClockFace } from "./analog-face";

interface ClockConfig {
  updateInterval: number;
  showSeconds: boolean;
  displayMode: "digital" | "analog";
}

const ClockWidget: Component<{ config: ClockConfig }> = (props) => {
  const [time, setTime] = createSignal(new Date());

  const intervalMs = () => {
    const value = Number(props.config.updateInterval);
    if (!Number.isFinite(value)) return 1000;
    return Math.max(100, value);
  };

  createEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, intervalMs());

    onCleanup(() => {
      clearInterval(interval);
    });
  });

  const formatTime = () => {
    const t = time();
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    if (props.config.showSeconds) {
      options.second = "2-digit";
    }

    return t.toLocaleTimeString("en-US", options);
  };

  return (
    <div class="flex h-full w-full items-center justify-center">
      <Show
        when={props.config.displayMode === "analog"}
        fallback={<span class="text-2xl">{formatTime()}</span>}
      >
        <AnalogClockFace time={time()} showSeconds={props.config.showSeconds} />
      </Show>
    </div>
  );
};

export default defineWidget<"status", ClockConfig>({
  manifest: {
    tag: "sample-clock-widget",
    type: "status",
    name: "Clock",
    description: "Display current time",
    icon: "mdi:clock-outline",
    size: "small",
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        updateInterval: {
          type: "number",
          title: "Update Interval (ms)",
          description: "How often the clock updates in milliseconds",
          minimum: 100,
          maximum: 5000,
          default: 1000,
        },
        showSeconds: {
          type: "boolean",
          title: "Show Seconds",
          description: "Display seconds in the time",
          default: true,
        },
        displayMode: {
          type: "string",
          title: "Display Mode",
          description: "Choose between digital or analog clock face",
          enum: ["digital", "analog"],
          default: "digital",
        },
      },
    },
    defaultConfig: { updateInterval: 1000, showSeconds: true, displayMode: "digital" },
  },
  component: ClockWidget,
});
