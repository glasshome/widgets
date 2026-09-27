import {
  Button,
  buildDebugData,
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
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { Tile, TileControls, TileGlyph, TileHead, TileHero } from "../common/tile/tile";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("button"),
});

type ButtonConfig = Infer<typeof configSchema>;

function ButtonWidget(props: { config: ButtonConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, dialogProps } = useWidgetDialog();
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

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Button";
  const lastPressed = () => {
    const stamp = entities()[0]?.state;
    const date = stamp ? new Date(stamp) : undefined;
    if (!date || Number.isNaN(date.getTime())) return undefined;
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const gestures = useWidgetGestures(() => ({ tap: handleTap }));
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
          <Tile>
            <TileGlyph icon="mdi:gesture-tap-button" />
            <TileHead
              icon="mdi:gesture-tap-button"
              eyebrow="Button"
              name={name()}
              count={entities().length}
            />
            <TileHero
              value={lastPressed() ?? ""}
              sub={lastPressed() ? "Last pressed" : "Never pressed"}
            />
            <TileControls>
              <Button variant="outline" class="tile-control-wide" onClick={handleTap}>
                <Icon icon="mdi:gesture-tap" width="1em" height="1em" />
                Press
              </Button>
            </TileControls>
          </Tile>
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
    maxSize: { w: 8, h: 8 },
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
