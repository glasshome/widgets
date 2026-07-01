import {
  defineWidget,
  useEntities,
  useService,
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
  entityIds: field.entities("lock"),
});

type LockConfig = Infer<typeof configSchema>;

function LockWidget(props: { config: LockConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:lock" width={32} />,
      title: "No lock entity",
      message: "Hold to configure",
    },
  });

  const { callService } = useService();

  const isLocked = createMemo(() => {
    const ents = entities();
    if (ents.length === 0) return false;
    return ents.some((e) => e.state === "locked");
  });

  const statusText = createMemo(() => {
    const total = count();
    if (total === 0) return "Unknown";
    if (total === 1) return isLocked() ? "Locked" : "Unlocked";
    const lockedCount = entities().filter((e) => e.state === "locked").length;
    if (lockedCount === 0) return "All unlocked";
    if (lockedCount === total) return "All locked";
    return `${lockedCount} of ${total} locked`;
  });

  const handleTap = async () => {
    if (isToggling()) return;
    setIsToggling(true);
    const timeout = setTimeout(() => setIsToggling(false), 5000);
    try {
      const service = isLocked() ? "unlock" : "lock";
      for (const e of entities()) {
        await callService("lock" as any, service as any, {}, { entity_id: e.id });
      }
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
        tone={isLocked() ? "success" : "warning"}
        loading={isToggling()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={isLocked() ? "mdi:lock" : "mdi:lock-open"} />}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Lock"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Lock"
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

export default defineWidget<LockConfig>({
  manifest: {
    name: "Lock",
    description: "Lock and unlock entities with security indicator",
    icon: "mdi:lock",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
  },
  configSchema,
  component: LockWidget,
});
