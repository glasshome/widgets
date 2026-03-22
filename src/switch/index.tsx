import { useEntities, useToggle } from "@glasshome/sync-layer/solid";
import {
  countActiveEntities,
  defineWidget,
  isEntityActive,
  stateColors,
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

interface SwitchConfig {
  title?: string;
  entityIds: string[];
}

function SwitchWidget(props: { config: SwitchConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);
  const [draftEntityIds, setDraftEntityIds] = createSignal<string[]>(props.config.entityIds);
  const hasChanges = () =>
    JSON.stringify(draftEntityIds()) !== JSON.stringify(props.config.entityIds);

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
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const colors = createMemo(() => (isOn() ? stateColors.active : stateColors.inactive));

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
                icon={<Icon icon={isOn() ? "mdi:power-plug" : "mdi:power-plug-off"} />}
                color={colors().icon}
                glow={isOn() ? colors().glow : undefined}
                entityCount={entities().length}
              />
              <div class="flex flex-col gap-1 overflow-hidden">
                <Widget.Title>
                  {props.config.title || entities()[0]?.friendlyName || "Switch"}
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
        onOpenChange={(open) => {
          if (!open) setDraftEntityIds(props.config.entityIds);
          setShowDialog(open);
        }}
        title="Switch"
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
            domain="switch"
          />
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<SwitchConfig>({
  manifest: {
    tag: "glasshome-switch",
    name: "Switch",
    description: "Toggle switch entities",
    icon: "mdi:power-plug",
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
  component: SwitchWidget,
});
