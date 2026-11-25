import {
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  Icon,
  type Infer,
  useConfirm,
  useEntities,
  useService,
  useTranslation,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { buttonLines } from "./words";
import en from "./locales/en.json";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("button"),
});

type ButtonConfig = Infer<typeof configSchema>;

function ButtonWidget(props: { config: ButtonConfig }) {
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
      icon: <Icon icon="mdi:gesture-tap-button" width={32} />,
      title: t("button.empty.title"),
      message: t("button.empty.message"),
    },
  });

  const { callService } = useService();

  const confirm = useConfirm();
  const press = async () => {
    for (const e of entities()) {
      await callService("button", "press", {}, { entity_id: e.id });
    }
  };
  const handleTap = async () => {
    if (isLoading()) return;
    setIsLoading(true);
    try {
      await confirm.run(["press"], press);
    } finally {
      setIsLoading(false);
    }
  };

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    t("button.name");
  const lines = () => buttonLines(tools, entities()[0]?.state);

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
            <Widget.Glyph icon="mdi:gesture-tap-button" />
            <Widget.Head
              icon="mdi:gesture-tap-button"
              eyebrow={t("button.name")}
              name={name()}
              count={entities().length}
            />
            <Widget.Hero value={lines().value} sub={lines().sub} />
            <Widget.Controls>
              <Widget.Action icon="mdi:gesture-tap" confirm={confirm} id="press" run={press}>
                {t("button.action.press")}
              </Widget.Action>
            </Widget.Controls>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={t("button.name")}
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
  messages: en,
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
