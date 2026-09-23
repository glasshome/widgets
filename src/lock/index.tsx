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
  buildDebugData,
  type WidgetDebugData,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";

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

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Lock";
  const heroValue = () => {
    if (count() > 1) return `${entities().filter((e) => e.state === "locked").length}/${count()}`;
    return isLocked() ? "Locked" : "Unlocked";
  };

  const handleTap = async () => {
    if (isToggling()) return;
    setIsToggling(true);
    const timeout = setTimeout(() => setIsToggling(false), 5000);
    try {
      const service = isLocked() ? "unlock" : "lock";
      for (const e of entities()) {
        await callService("lock", service, {}, { entity_id: e.id });
      }
    } finally {
      clearTimeout(timeout);
      setIsToggling(false);
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
        tone={isLocked() ? "success" : "warning"}
        loading={isToggling()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Tile active={isLocked()}>
            <TileGlyph icon={isLocked() ? "mdi:lock" : "mdi:lock-open"} />
            <TileHead
              icon={isLocked() ? "mdi:lock" : "mdi:lock-open-variant"}
              eyebrow={count() > 1 ? "Locked" : "Lock"}
              name={name()}
              active={isLocked()}
              count={entities().length}
            />
            <TileHero value={heroValue()} />
          </Tile>
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
    examples: [
      {
        label: "Locks",
        size: { w: 2, h: 2 },
        config: { entityIds: ["lock.front_door_lock", "lock.back_door_lock"], title: "Locks" },
      },
    ],
  },
  configSchema,
  component: LockWidget,
});
