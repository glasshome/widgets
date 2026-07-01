import {
  countActiveEntities,
  defineWidget,
  isEntityActive,
  useEntities,
  useToggle,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  field,
  defineConfig,
  type Infer,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("switch"),
});

type SwitchConfig = Infer<typeof configSchema>;

function SwitchWidget(props: { config: SwitchConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count, aggregatedData } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:power-plug" width={32} />,
      title: "No switch entity",
      message: "Hold to configure",
    },
  });

  const toggle = useToggle();

  const isOn = createMemo(() => {
    const ents = entities();
    if (ents.length === 0) return false;
    return ents.some((e) => isEntityActive(e));
  });

  const activeCount = createMemo(() => countActiveEntities(entities()));

  const statusText = createMemo(() => {
    const total = count();
    if (total === 0) return "Off";
    if (total === 1) return isOn() ? "On" : "Off";
    const active = activeCount();
    if (active === 0) return "All off";
    if (active === total) return "All on";
    return `${active} of ${total} on`;
  });

  const handleTap = async () => {
    if (isToggling()) return;
    setIsToggling(true);
    const timeout = setTimeout(() => setIsToggling(false), 5000);
    try {
      const ids = entities().map((e) => e.id);
      await toggle(ids);
    } finally {
      clearTimeout(timeout);
      setIsToggling(false);
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
        tone={isOn() ? "success" : "neutral"}
        loading={isToggling()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={isOn() ? "mdi:power-plug" : "mdi:power-plug-off"} />}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Switch"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Switch"
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

export default defineWidget<SwitchConfig>({
  manifest: {
    name: "Switch",
    description: "Toggle switch entities",
    icon: "mdi:power-plug",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
  },
  configSchema,
  component: SwitchWidget,
});
