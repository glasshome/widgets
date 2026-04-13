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
  entityIds: widgetFields.entityIds("lock"),
});

type LockConfig = z.infer<typeof configSchema>;

const lockedColors = {
  gradient: "bg-gradient-to-br from-emerald-600/20 to-green-700/20",
  icon: "bg-emerald-500 dark:bg-emerald-400",
  glow: "shadow-emerald-500/50 dark:shadow-emerald-400/50",
};

const unlockedColors = {
  gradient: "bg-gradient-to-br from-amber-500/20 to-orange-600/20",
  icon: "bg-amber-500 dark:bg-amber-400",
  glow: "shadow-amber-500/50 dark:shadow-amber-400/50",
};

function LockWidget(props: { config: LockConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
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
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const colors = createMemo(() => (isLocked() ? lockedColors : unlockedColors));

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
          gradient={colors().gradient}
          loading={isToggling()}
          emptyState={emptyState()}
        >
          <Show when={hasEntities()}>
            <Widget.Content>
              <Widget.Icon
                icon={<Icon icon={isLocked() ? "mdi:lock" : "mdi:lock-open"} />}
                color={colors().icon}
                glow={colors().glow}
                entityCount={entities().length}
              />
              <div class="flex flex-col gap-1 overflow-hidden">
                <Widget.Title>
                  {props.config.title || entities()[0]?.friendlyName || "Lock"}
                </Widget.Title>
                <Widget.Status>{statusText()}</Widget.Status>
              </div>
            </Widget.Content>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
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
    sdkVersion: "^0.2.0",
  },
  configSchema,
  component: LockWidget,
});
