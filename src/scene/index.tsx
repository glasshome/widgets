import { useEntities, useTurnOn } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("scene"),
});

type SceneConfig = z.infer<typeof configSchema>;

function SceneWidget(props: { config: SceneConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [isLoading, setIsLoading] = createSignal(false);

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
      hold: { action: openDialog },
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
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone="accent"
        loading={isLoading()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon icon={<Icon icon="mdi:palette" />} />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  (entities().length > 1 ? "Scenes" : entities()[0]?.friendlyName) ||
                  "Scene"}
              </Widget.Title>
              <Widget.Status>Activate</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Scene"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<SceneConfig>({
  manifest: {
    name: "Scene",
    description: "Activate a scene",
    icon: "mdi:palette",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: SceneWidget,
});
