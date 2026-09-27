import {
  Button,
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useEntities,
  useTurnOn,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import "./scene.css";
import { widgetDialogProps } from "../common";
import { Tile, TileGlyph, TileHead } from "../common/tile/tile";
import { useConfirm } from "../common/use-confirm";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("scene"),
});

type SceneConfig = Infer<typeof configSchema>;

function SceneWidget(props: { config: SceneConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, dialogProps } = useWidgetDialog();
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

  const confirm = useConfirm();
  const run = async (ids: string[]) => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      await confirm.run(ids, async () => {
        for (const id of ids) await turnOn(id);
      });
    } finally {
      setIsLoading(false);
    }
  };
  const sceneIcon = () => (confirm.any() ? "mdi:check" : "mdi:palette");
  const handleTap = () => run(entities().map((e) => e.id));

  /** Home Assistant keeps a scene's last run as its state, so this holds on every screen. */
  const lastRan = () => {
    const stamps = entities()
      .map((e) => new Date(e.state).getTime())
      .filter((t) => !Number.isNaN(t));
    if (stamps.length === 0) return undefined;
    const at = new Date(Math.max(...stamps));
    const time = at.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    return at.toDateString() === new Date().toDateString()
      ? `Ran at ${time}`
      : `Ran ${at.toLocaleDateString([], { weekday: "short" })} ${time}`;
  };

  const name = () =>
    props.config.title ||
    (entities().length === 1 ? entities()[0]?.friendlyName : undefined) ||
    "Scenes";
  // A group named "Scenes" already says what the count would.
  const eyebrow = () => {
    const ranLine = lastRan();
    if (ranLine) return ranLine;
    const count = entities().length;
    if (count === 1) return "Scene";
    return name() === "Scenes" ? undefined : `${count} scenes`;
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
          <Tile confirmed={confirm.any()}>
            <TileGlyph icon={sceneIcon()} />
            <TileHead icon={sceneIcon()} eyebrow={eyebrow()} name={name()} active={confirm.any()} />
            <div class="scene-chips" on:pointerdown={(e) => e.stopPropagation()}>
              <For each={entities()}>
                {(e) => (
                  <Button
                    variant="outline"
                    class="scene-chip"
                    data-confirmed={confirm.has(e.id) || undefined}
                    onClick={() => void run([e.id])}
                  >
                    <Icon
                      icon={confirm.has(e.id) ? "mdi:check" : "mdi:play"}
                      width="1em"
                      height="1em"
                    />
                    {entities().length > 1 ? e.friendlyName : "Activate"}
                  </Button>
                )}
              </For>
            </div>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Scene"
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

export default defineWidget<SceneConfig>({
  manifest: {
    name: "Scene",
    description: "Activate a scene",
    icon: "mdi:palette",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "One scene",
        size: {
          w: 1,
          h: 1,
        },
        config: {
          entityIds: ["scene.movie_night"],
          title: "Movie Night",
        },
      },
      {
        label: "Scenes",
        size: {
          w: 2,
          h: 2,
        },
        config: {
          entityIds: ["scene.movie_night", "scene.good_morning"],
          title: "Scenes",
        },
      },
      {
        label: "Wide",
        size: {
          w: 4,
          h: 1,
        },
        config: {
          entityIds: ["scene.movie_night", "scene.good_morning"],
          title: "Scenes",
        },
      },
    ],
  },
  configSchema,
  component: SceneWidget,
});
