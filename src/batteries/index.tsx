import { extractDomain, state } from "@glasshome/sync-layer";
import { useEntities } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { filterAndSortBatteries, getBatteryColor, getBatteryIcon } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  threshold: z.number().min(0).max(100).default(20).meta({ label: "Low Battery Threshold (%)" }),
  whitelist: z.array(z.string()).default([]).meta({ label: "Whitelist (include only these)" }),
  blacklist: z.array(z.string()).default([]).meta({ label: "Blacklist (exclude these)" }),
});
type BatteriesConfig = z.infer<typeof configSchema>;

function BatteriesWidget(props: { config: BatteriesConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  // Derive battery entity IDs from registry metadata instead of subscribing to all sensors
  const batteryIds = createMemo(() => {
    const ids: string[] = [];
    for (const [entityId, entry] of Object.entries(state.entityRegistry)) {
      if (extractDomain(entityId) !== "sensor") continue;
      const dc = entry.device_class ?? entry.original_device_class;
      if (dc === "battery") ids.push(entityId);
    }
    return ids;
  });
  const sensorEntities = useEntities(batteryIds);

  const batteries = createMemo(() => filterAndSortBatteries(sensorEntities(), props.config));

  const lowCount = createMemo(() => batteries().filter((b) => b.isLow).length);
  const totalCount = createMemo(() => batteries().length);
  const hasLow = createMemo(() => lowCount() > 0);

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const colors = createMemo(() => (hasLow() ? stateColors.warning : stateColors.active));

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = sensorEntities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      batteryCount: totalCount(),
      lowCount: lowCount(),
    });
  });

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
        <Widget variant="classic-glass" gradient={colors().gradient}>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={hasLow() ? "mdi:battery-alert" : "mdi:battery"} />}
              color={colors().icon}
              glow={hasLow() ? colors().glow : undefined}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>{props.config.title || "Batteries"}</Widget.Title>
              <Widget.Value value={hasLow() ? `${lowCount()} low` : "All good"} />
              <Widget.Status>{totalCount()} batteries</Widget.Status>
            </div>
          </Widget.Content>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Batteries"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={
          <div class="flex flex-col gap-2">
            <Show
              when={batteries().length > 0}
              fallback={
                <div class="py-8 text-center text-muted-foreground text-sm">
                  No battery sensors found
                </div>
              }
            >
              <div class="max-h-80 space-y-2 overflow-y-auto">
                <For each={batteries()}>
                  {(battery) => (
                    <div class="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2">
                      <Icon
                        icon={getBatteryIcon(battery.level)}
                        width={24}
                        style={{ color: getBatteryColor(battery.level) }}
                      />
                      <div class="min-w-0 flex-1">
                        <div class="truncate font-medium text-sm">
                          {battery.entity.friendlyName || battery.entity.id}
                        </div>
                        <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            class="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, battery.level))}%`,
                              "background-color": getBatteryColor(battery.level),
                            }}
                          />
                        </div>
                      </div>
                      <span
                        class="font-medium text-sm tabular-nums"
                        style={{ color: getBatteryColor(battery.level) }}
                      >
                        {battery.level}%
                      </span>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </div>
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<BatteriesConfig>({
  manifest: {
    name: "Batteries",
    description: "Auto-discover and monitor battery levels across all devices",
    icon: "mdi:battery",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.2.0",
  },
  configSchema,
  component: BatteriesWidget,
});
