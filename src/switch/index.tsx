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
  useEntityCommand,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createMemo, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { groupLine } from "../common/group";
import { SwitchSheet } from "./sheet";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("switch"),
});

type SwitchConfig = Infer<typeof configSchema>;

function SwitchWidget(props: { config: SwitchConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "switch",
    emptyStateConfig: {
      icon: <Icon icon="mdi:power-plug" width={32} />,
      title: "No switch entity",
      message: "Hold to configure",
    },
  });

  const { turnOn, turnOff } = useService();

  const reportedOn = createMemo(() => {
    const ents = entities();
    if (ents.length === 0) return false;
    return ents.some((e) => isEntityActive(e));
  });
  const power = useEntityCommand<boolean>({
    reported: reportedOn,
    send: (on) => {
      const ids = entities().map((e) => e.id);
      return on ? turnOn(ids) : turnOff(ids);
    },
  });
  const isOn = power.value;
  const isToggling = power.busy;

  const activeCount = createMemo(() => countActiveEntities(entities()));

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Switch";
  const heroValue = () => (isOn() ? "On" : "Off");

  const handleTap = async () => {
    if (isToggling()) return;
    await power.run(!isOn());
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
              eyebrow={
                count() > 1
                  ? groupLine(activeCount(), count(), { active: "on", rest: "off" })
                  : "Switch"
              }
              name={name()}
              active={isOn()}
              count={entities().length}
            />
            <Widget.Hero value={heroValue()} />
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
  manifest: {
    name: "Switch",
    description: "Toggle switch entities",
    icon: "mdi:power-plug",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 2, h: 2 },
    sdkVersion: "^2.0.0",
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
