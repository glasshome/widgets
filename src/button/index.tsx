import { useEntities, useService } from "@glasshome/sync-layer/solid";
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
  entityIds: widgetFields.entityIds("button"),
});

type ButtonConfig = z.infer<typeof configSchema>;

function ButtonWidget(props: { config: ButtonConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [isLoading, setIsLoading] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:gesture-tap-button" width={32} />,
      title: "No button entity",
      message: "Hold to configure",
    },
  });

  const { callService } = useService();

  const handleTap = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    const timeout = setTimeout(() => setIsLoading(false), 5000);
    try {
      for (const e of entities()) {
        await callService("button" as any, "press" as any, {}, { entity_id: e.id });
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
            <Widget.Icon
              icon={<Icon icon="mdi:gesture-tap-button" />}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Button"}
              </Widget.Title>
              <Widget.Status>Press</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Button"
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

export default defineWidget<ButtonConfig>({
  manifest: {
    name: "Button",
    description: "Press a button entity",
    icon: "mdi:gesture-tap-button",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.5.0",
  },
  configSchema,
  component: ButtonWidget,
});
