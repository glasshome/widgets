import { byDomain, useEntities } from "@glasshome/sync-layer/solid";
import { Icon } from "@iconify-icon/solid";
import {
  defineWidget,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import type { BatteriesConfig } from "./utils";
import { filterAndSortBatteries, getBatteryColor, getBatteryIcon } from "./utils";

function BatteriesWidget(props: { config: BatteriesConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  const [draftThreshold, setDraftThreshold] = createSignal(props.config.threshold ?? 20);
  const [draftWhitelist, setDraftWhitelist] = createSignal(
    (props.config.whitelist ?? []).join(", "),
  );
  const [draftBlacklist, setDraftBlacklist] = createSignal(
    (props.config.blacklist ?? []).join(", "),
  );

  const hasChanges = () =>
    draftThreshold() !== (props.config.threshold ?? 20) ||
    draftWhitelist() !== (props.config.whitelist ?? []).join(", ") ||
    draftBlacklist() !== (props.config.blacklist ?? []).join(", ");

  const sensorIds = createMemo(() => byDomain()["sensor"] ?? []);
  const sensorEntities = useEntities(sensorIds);

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

  const parseList = (value: string): string[] =>
    value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  return (
    <>
      <div
        class="h-full w-full"
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
              <Widget.Value
                value={hasLow() ? `${lowCount()} low` : "All good"}
              />
              <Widget.Status>{totalCount()} batteries</Widget.Status>
            </div>
          </Widget.Content>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) {
            setDraftThreshold(props.config.threshold ?? 20);
            setDraftWhitelist((props.config.whitelist ?? []).join(", "));
            setDraftBlacklist((props.config.blacklist ?? []).join(", "));
          }
          setShowDialog(open);
        }}
        title="Batteries"
        maxWidth="lg"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({
            ...props.config,
            threshold: draftThreshold(),
            whitelist: parseList(draftWhitelist()),
            blacklist: parseList(draftBlacklist()),
          });
          setShowDialog(false);
        }}
        editContent={
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Low Battery Threshold (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={draftThreshold()}
                onInput={(e) => setDraftThreshold(Number(e.currentTarget.value))}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Whitelist (comma-separated entity fragments)</label>
              <input
                type="text"
                value={draftWhitelist()}
                onInput={(e) => setDraftWhitelist(e.currentTarget.value)}
                placeholder="e.g. phone, tablet"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="text-sm font-medium">Blacklist (comma-separated entity fragments)</label>
              <input
                type="text"
                value={draftBlacklist()}
                onInput={(e) => setDraftBlacklist(e.currentTarget.value)}
                placeholder="e.g. test, virtual"
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        }
        controlsContent={
          <div class="flex flex-col gap-2">
            <Show
              when={batteries().length > 0}
              fallback={
                <div class="py-8 text-center text-sm text-muted-foreground">
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
                        <div class="truncate text-sm font-medium">
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
                        class="text-sm font-medium tabular-nums"
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

export default defineWidget<"status", BatteriesConfig>({
  manifest: {
    tag: "glasshome-batteries",
    type: "status",
    name: "Batteries",
    description: "Auto-discover and monitor battery levels across all devices",
    icon: "mdi:battery",
    size: "medium",
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        threshold: {
          type: "number",
          title: "Low Battery Threshold",
          default: 20,
        },
        whitelist: {
          type: "array",
          title: "Whitelist",
          items: { type: "string" },
          default: [],
        },
        blacklist: {
          type: "array",
          title: "Blacklist",
          items: { type: "string" },
          default: [],
        },
      },
    },
    defaultConfig: { threshold: 20, whitelist: [], blacklist: [] },
  },
  component: BatteriesWidget,
});
