import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  Icon,
  type Infer,
  useConfirm,
  useEntities,
  useTranslation,
  useTurnOn,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import "./scene.css";
import { widgetDialogProps } from "../common";
import { sceneEyebrow } from "./words";
import en from "./locales/en.json";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("scene"),
});

type SceneConfig = Infer<typeof configSchema>;

function SceneWidget(props: { config: SceneConfig }) {
  const ctx = useWidgetContext();
  const tools = useTranslation();
  const { t } = tools;
  const { setShowDialog, dialogProps } = useWidgetDialog();
  const [isLoading, setIsLoading] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:palette" width={32} />,
      title: t("scene.empty.title"),
      message: t("scene.empty.message"),
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
  const handleTap = () => run(entities().map((e) => e.id));

  const name = () =>
    props.config.title ||
    (entities().length === 1 ? entities()[0]?.friendlyName : undefined) ||
    t("scene.name.many");
  const eyebrow = () =>
    sceneEyebrow(tools, { states: entities().map((e) => e.state), name: name() });
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
        confirmed={confirm.any()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Glyph icon="mdi:palette" />
            <Widget.Head
              icon="mdi:palette"
              eyebrow={eyebrow()}
              name={name()}
              homeName={name() !== t("scene.name.many")}
            />
            <div class="scene-chips">
              <For each={entities()}>
                {(e) => (
                  <Widget.Action
                    icon="mdi:play"
                    class="scene-chip"
                    confirm={confirm}
                    id={e.id}
                    run={() => turnOn(e.id)}
                  >
                    {entities().length > 1 ? e.friendlyName : t("scene.action.activate")}
                  </Widget.Action>
                )}
              </For>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={t("scene.name.one")}
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
  messages: en,
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
