import {
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isEntityActive,
  useEntities,
  useService,
  useToggle,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  WidgetSliderFill,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { FanControls } from "./controls";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("fan"),
});
type FanConfig = Infer<typeof configSchema>;

function FanWidget(props: { config: FanConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const toggle = useToggle();
  const { callService } = useService();

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:fan" width={32} />,
      title: "No fan entity",
      message: "Hold to configure",
    },
  });

  const firstEntity = createMemo(() => entities()[0]);
  const isOn = createMemo(() => {
    const ents = entities();
    return ents.length > 0 && ents.some((e) => isEntityActive(e));
  });
  const activeCount = createMemo(() => entities().filter((e) => isEntityActive(e)).length);
  const isUnavailable = createMemo(() => {
    const state = firstEntity()?.state;
    return count() === 1 && (state === "unavailable" || state === "unknown");
  });

  // Fans without SET_SPEED expose neither percentage nor percentage_step.
  const supportsSpeed = createMemo(() => {
    const a = firstEntity()?.attributes;
    return a?.percentage !== undefined || a?.percentage_step !== undefined;
  });

  const serverPercentage = createMemo(() => {
    const first = firstEntity();
    if (first?.state !== "on") return 0;
    const pct = first.attributes?.percentage as number | undefined;
    return pct ?? 100;
  });

  const [uiPercentage, setUiPercentage] = createSignal(serverPercentage());
  const [isDragging, setIsDragging] = createSignal(false);

  // Sync server percentage to UI when not dragging
  createEffect(() => {
    const sp = serverPercentage();
    if (!isDragging()) setUiPercentage(sp);
  });

  let slideDebounce: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (slideDebounce) clearTimeout(slideDebounce);
  });

  const handleSpeedSlide = (value: number) => {
    setIsDragging(true);
    setUiPercentage(value);
    if (slideDebounce) clearTimeout(slideDebounce);
    slideDebounce = setTimeout(() => {
      setIsDragging(false);
      for (const e of entities()) {
        callService(
          "fan",
          "set_percentage",
          { percentage: Math.round(value) },
          { entity_id: e.id },
        );
      }
    }, 300);
  };

  const handleTap = async () => {
    const ids = entities().map((e) => e.id);
    if (ids.length === 0) return;
    await toggle(ids);
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    ...(supportsSpeed()
      ? {
          slide: {
            value: uiPercentage(),
            onChange: handleSpeedSlide,
            min: 0,
            max: 100,
            orientation: "auto" as const,
            activationDelay: 0,
          },
        }
      : {}),
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

  const statusText = createMemo(() => {
    if (isUnavailable()) return "Unavailable";
    const total = count();
    if (total === 0 || !isOn()) return "Off";
    if (total > 1) return `${activeCount()}/${total} on`;
    const pct = Math.round(uiPercentage());
    if (supportsSpeed() && pct > 0) return `On - ${pct}%`;
    const preset = firstEntity()?.attributes?.preset_mode as string | undefined;
    if (preset) return `On - ${preset.charAt(0).toUpperCase()}${preset.slice(1)}`;
    return "On";
  });

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      uiPercentage: uiPercentage(),
    });
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone={supportsSpeed() ? "neutral" : isOn() ? "success" : "neutral"}
        emptyState={emptyState()}
        class={isDragging() ? "duration-0" : undefined}
      >
        <Show when={hasEntities()}>
          <Show when={supportsSpeed()}>
            <WidgetSliderFill
              value={uiPercentage()}
              color="var(--primary)"
              isDragging={isDragging()}
            />
          </Show>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={isOn() ? "mdi:fan" : "mdi:fan-off"} />}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Fan"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Fan"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<FanControls entities={entities} />}
        debugContent={<Show when={debugData()}>{(data) => <WidgetDebugView data={data()} />}</Show>}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<FanConfig>({
  manifest: {
    name: "Fan",
    description: "Fan control with speed, presets, oscillation, and direction",
    icon: "mdi:fan",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.4.0",
    examples: [
      {
        label: "Ceiling fan",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.bedroom_ceiling"], title: "Bedroom Fan" },
      },
      {
        label: "Purifier",
        size: { w: 2, h: 2 },
        config: { entityIds: ["fan.air_purifier"] },
      },
    ],
  },
  configSchema,
  component: FanWidget,
});
