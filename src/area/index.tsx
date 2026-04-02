import { useArea, useAreas, useService } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { AreaContent } from "./area-content";
import { AreaControls } from "./area-controls";
import { calculateMetrics, groupEntitiesByDomain } from "./utils";

interface AreaConfig {
  title?: string;
  areaId: string;
}

function AreaSelector(props: { selectedAreaId: string; onSelect: (areaId: string) => void }) {
  const areas = useAreas();
  const [search, setSearch] = createSignal("");

  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    if (!q) return areas();
    return areas().filter((a) => a.name.toLowerCase().includes(q));
  });

  return (
    <div class="flex flex-col gap-2">
      <input
        type="text"
        placeholder="Search areas..."
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
        class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div class="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto">
        <For each={filtered()}>
          {(area) => (
            <button
              type="button"
              class={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border p-3 text-center transition-colors ${
                props.selectedAreaId === area.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
              onClick={() => props.onSelect(area.id)}
            >
              <Icon icon={area.icon || "mdi:home-floor-1"} width={24} />
              <span class="w-full truncate font-medium text-sm">{area.name}</span>
              <span class="text-muted-foreground text-xs">{area.entities.length} entities</span>
            </button>
          )}
        </For>
      </div>
      <Show when={filtered().length === 0}>
        <div class="p-4 text-center text-muted-foreground text-sm">No areas found</div>
      </Show>
    </div>
  );
}

function AreaWidget(props: { config: AreaConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const { turnOn, turnOff } = useService();
  const [draftAreaId, setDraftAreaId] = createSignal(props.config.areaId);
  const [draftTitle, setDraftTitle] = createSignal(props.config.title ?? "");
  const hasChanges = () =>
    draftAreaId() !== props.config.areaId || draftTitle() !== (props.config.title ?? "");

  const area = useArea(() => props.config.areaId);

  const groups = createMemo(() => {
    const a = area();
    if (!a)
      return { lights: [], switches: [], covers: [], climate: [], sensors: [], binarySensors: [] };
    return groupEntitiesByDomain(a.entities);
  });

  const metrics = createMemo(() => calculateMetrics(groups(), area()));

  const areaIcon = createMemo(() => area()?.icon || "mdi:home-floor-1");
  const areaName = createMemo(() => props.config.title || area()?.name || "Area");
  const isActive = createMemo(() => metrics().lightsOn > 0);
  const colors = createMemo(() => (isActive() ? stateColors.active : stateColors.inactive));

  // Light toggle handler — lifted here so useService() is called once
  const toggleLights = () => {
    const lights = groups().lights.filter(
      (l) => l.state !== "unavailable" && l.state !== "unknown",
    );
    if (lights.length === 0) return;
    const action = isActive() ? turnOff : turnOn;
    Promise.allSettled(lights.map((l) => action(l.id)));
  };

  const gestures = useWidgetGestures(
    () => ({ hold: { action: openDialog, delay: 300 } }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const a = area();
    if (!a) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, a.entities, {
      metrics: metrics(),
      groups: {
        lights: groups().lights.length,
        switches: groups().switches.length,
        covers: groups().covers.length,
        climate: groups().climate.length,
        sensors: groups().sensors.length,
        binarySensors: groups().binarySensors.length,
      },
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
        <Widget
          variant="classic-glass"
          gradient={colors().gradient}
          emptyState={
            !props.config.areaId
              ? {
                  icon: <Icon icon="mdi:home-floor-1" width={32} />,
                  title: "No area selected",
                  message: "Hold to select area",
                }
              : area() === undefined
                ? {
                    icon: <Icon icon="mdi:home-alert" width={32} />,
                    title: "Area not found",
                    message: "Hold to change area",
                  }
                : undefined
          }
        >
          <Show when={area()}>
            <Widget.Content>
              <AreaContent
                metrics={metrics()}
                groups={groups()}
                areaName={areaName()}
                areaIcon={areaIcon()}
                onToggleLights={toggleLights}
              />
            </Widget.Content>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) {
            setDraftAreaId(props.config.areaId);
            setDraftTitle(props.config.title ?? "");
          }
          setShowDialog(open);
        }}
        title="Area"
        maxWidth="lg"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({
            ...props.config,
            areaId: draftAreaId(),
            title: draftTitle() || undefined,
          });
          setShowDialog(false);
        }}
        editContent={
          <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-sm">Title override</label>
              <input
                type="text"
                placeholder="Use area name"
                value={draftTitle()}
                onInput={(e) => setDraftTitle(e.currentTarget.value)}
                class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div class="flex flex-col gap-1.5">
              <label class="font-medium text-sm">Area</label>
              <AreaSelector selectedAreaId={draftAreaId()} onSelect={setDraftAreaId} />
            </div>
          </div>
        }
        controlsContent={<AreaControls groups={groups()} />}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<AreaConfig>({
  manifest: {
    name: "Area",
    description: "Area overview with entity grouping and batch controls",
    icon: "mdi:home-floor-1",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 6 },
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        areaId: {
          type: "string",
          title: "Area ID",
          default: "",
        },
      },
    },
    defaultConfig: { areaId: "" },
  },
  component: AreaWidget,
});
