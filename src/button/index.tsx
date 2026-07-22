import {
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useEntities,
  useService,
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
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("button"),
});

type ButtonConfig = Infer<typeof configSchema>;

function ButtonWidget(props: { config: ButtonConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
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
        await callService("button", "press", {}, { entity_id: e.id });
      }
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    hold: { action: openDialog },
  }));
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
        {...dialogProps}
        title="Button"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        debugContent={<Show when={debugData()}>{(data) => <WidgetDebugView data={data()} />}</Show>}
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
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Single button",
        size: { w: 1, h: 1 },
        config: { title: "Restart", entityIds: ["button.restart_home_assistant"] },
      },
      {
        label: "Button group",
        size: { w: 2, h: 1 },
        config: {
          title: "Maintenance",
          entityIds: ["button.restart_home_assistant", "button.update_firmware"],
        },
      },
    ],
  },
  configSchema,
  component: ButtonWidget,
});
