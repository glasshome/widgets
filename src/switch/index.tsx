import {
  buildDebugData,
  countActiveEntities,
  defineConfig,
  defineWidget,
  field,
  Icon,
  type Infer,
  isEntityActive,
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
import { SwitchSheet } from "./sheet";
import { switchLines } from "./words";
import en from "./locales/en.json";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("switch"),
});

type SwitchConfig = Infer<typeof configSchema>;

function SwitchWidget(props: { config: SwitchConfig }) {
  const ctx = useWidgetContext();
  const tools = useTranslation();
  const { t } = tools;
  const { setShowDialog, dialogProps } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:power-plug" width={32} />,
      title: t("switch.empty.title"),
      message: t("switch.empty.message"),
    },
  });

  const { turnOn, turnOff } = useService();

  const isOn = createMemo(() => {
    const ents = entities();
    if (ents.length === 0) return false;
    return ents.some((e) => isEntityActive(e));
  });

  const activeCount = createMemo(() => countActiveEntities(entities()));

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    t("switch.name");
  const lines = createMemo(() =>
    switchLines(tools, {
      sample: entities()[0],
      isOn: isOn(),
      count: count(),
      activeCount: activeCount(),
    }),
  );

  const handleTap = async () => {
    if (isToggling()) return;
    setIsToggling(true);
    const timeout = setTimeout(() => setIsToggling(false), 5000);
    try {
      const ids = entities().map((e) => e.id);
      await (isOn() ? turnOff(ids) : turnOn(ids));
    } finally {
      clearTimeout(timeout);
      setIsToggling(false);
    }
  };

  const extras = createMemo(() => entities().length > 1);

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
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
        tone={isOn() ? "success" : "neutral"}
        loading={isToggling()}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Glyph icon={isOn() ? "mdi:power-plug" : "mdi:power-plug-off"} />
            <Widget.Head
              icon={isOn() ? "mdi:power-plug" : "mdi:power-plug-off"}
              eyebrow={lines().eyebrow}
              name={name()}
              homeName={name() !== t("switch.name")}
              active={isOn()}
              count={entities().length}
            />
            <Widget.Hero value={lines().hero} />
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={name()}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(extras() ? { sheet: () => <SwitchSheet entities={entities()} name={name()} /> } : {})}
        tile={{
          icon: isOn() ? "mdi:power-plug" : "mdi:power-plug-off",
          tone: isOn() ? "var(--tone-success)" : undefined,
        }}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<SwitchConfig>({
  messages: en,
  manifest: {
    name: "Switch",
    description: "Toggle switch entities",
    icon: "mdi:power-plug",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 2, h: 2 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "On",
        size: {
          w: 2,
          h: 2,
        },
        config: {
          entityIds: ["switch.fan_living_room"],
          title: "Living Room Fan",
        },
      },
      {
        label: "Off",
        size: {
          w: 1,
          h: 1,
        },
        config: {
          entityIds: ["switch.coffee_machine"],
          title: "Coffee Machine",
        },
      },
      {
        label: "Switches",
        size: {
          w: 2,
          h: 2,
        },
        config: {
          entityIds: ["switch.coffee_machine", "switch.fan_living_room"],
          title: "Switches",
        },
      },
    ],
  },
  configSchema,
  component: SwitchWidget,
});
