import {
  buildDebugData,
  countActiveEntities,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isEntityActive,
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
import { groupLine } from "../common/group";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { SwitchSheet } from "./sheet";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("switch"),
});

type SwitchConfig = Infer<typeof configSchema>;

function SwitchWidget(props: { config: SwitchConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const [isToggling, setIsToggling] = createSignal(false);

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
    "Switch";
  const heroValue = () => (isOn() ? "On" : "Off");

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
    hold: extras() ? { action: openDialog } : undefined,
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
          <Tile active={isOn()}>
            <TileGlyph icon={isOn() ? "mdi:power-plug" : "mdi:power-plug-off"} />
            <TileHead
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
            <TileHero value={heroValue()} />
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Switch"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(extras() ? { sheet: <SwitchSheet entities={entities()} name={name()} /> } : {})}
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
