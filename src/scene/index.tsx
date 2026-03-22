import { useEntities, useTurnOn } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getGradient,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, EntitySelector, WidgetDebugView, widgetDialogProps } from "../common";

interface SceneConfig {
  title?: string;
  entityIds: string[];
}

function SceneWidget(props: { config: SceneConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [isLoading, setIsLoading] = createSignal(false);
  const [draftEntityIds, setDraftEntityIds] = createSignal<string[]>(props.config.entityIds);
  const hasChanges = () =>
    JSON.stringify(draftEntityIds()) !== JSON.stringify(props.config.entityIds);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:palette" width={32} />,
      title: "No scene",
      message: "Hold to configure",
    },
  });

  const turnOn = useTurnOn();

  const handleTap = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    try {
      for (const e of entities()) {
        await turnOn(e.id);
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const gestures = useWidgetGestures(
    () => ({
      tap: handleTap,
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents);
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
          gradient={getGradient(undefined, "scene")}
          loading={isLoading()}
          emptyState={emptyState()}
        >
          <Show when={hasEntities()}>
            <Widget.Content>
              <Widget.Icon
                icon={<Icon icon="mdi:palette" />}
                color="bg-purple-500 dark:bg-purple-400"
              />
              <div class="flex flex-col gap-1 overflow-hidden">
                <Widget.Title>
                  {props.config.title || entities()[0]?.friendlyName || "Scene"}
                </Widget.Title>
                <Widget.Status>Activate</Widget.Status>
              </div>
            </Widget.Content>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) setDraftEntityIds(props.config.entityIds);
          setShowDialog(open);
        }}
        title="Scene"
        maxWidth="lg"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({ ...props.config, entityIds: draftEntityIds() });
          setShowDialog(false);
        }}
        editContent={
          <EntitySelector
            entityIds={draftEntityIds()}
            onEntityIdsChange={setDraftEntityIds}
            domain="scene"
          />
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<SceneConfig>({
  manifest: {
    tag: "glasshome-scene",
    name: "Scene",
    description: "Activate a scene",
    icon: "mdi:palette",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        entityIds: {
          type: "array",
          title: "Entities",
          items: { type: "string" },
          default: [],
        },
      },
    },
    defaultConfig: { entityIds: [] },
  },
  component: SceneWidget,
});
