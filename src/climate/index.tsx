import { useEntities } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  stateColors,
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
import { ClimateControls } from "./controls";
import { formatTemperature, getHvacModeColor, getHvacModeIcon, HVAC_MODES } from "./utils";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("climate"),
});
type ClimateConfig = z.infer<typeof configSchema>;

function ClimateWidget(props: { config: ClimateConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:thermostat" width={32} />,
      title: "No climate entity",
      message: "Hold to configure",
    },
  });

  const entity = createMemo(() => entities()[0]);
  const hvacMode = createMemo(() => (entity()?.state ?? "off") as string);
  const isOff = createMemo(() => hvacMode() === "off");

  const currentTemp = createMemo(
    () => entity()?.attributes?.current_temperature as number | undefined,
  );
  const targetTemp = createMemo(() => entity()?.attributes?.temperature as number | undefined);
  const hvacAction = createMemo(() => entity()?.attributes?.hvac_action as string | undefined);
  const tempUnit = createMemo(() => {
    const unit = entity()?.attributes?.temperature_unit as string | undefined;
    if (unit) return unit.replace("°", "");
    return "C";
  });

  const iconName = createMemo(() => getHvacModeIcon(hvacMode()));
  const gradient = createMemo(() => {
    if (isOff()) return stateColors.inactive.gradient;
    return getHvacModeColor(hvacMode());
  });

  const statusText = createMemo(() => {
    const mode = HVAC_MODES[hvacMode()]?.label ?? hvacMode();
    const ct = currentTemp();
    if (ct === undefined) return mode;

    const action = hvacAction();
    if (action && action !== "idle" && action !== "off") {
      const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
      const tt = targetTemp();
      if (tt !== undefined) {
        return `${actionLabel} to ${formatTemperature(tt, tempUnit())}`;
      }
      return actionLabel;
    }

    return `${mode} - ${formatTemperature(ct, tempUnit())}`;
  });

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

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
        <Widget variant="classic-glass" gradient={gradient()} emptyState={emptyState()}>
          <Show when={hasEntities()}>
            <Widget.Content>
              <Widget.Icon
                icon={<Icon icon={iconName()} />}
                color={isOff() ? stateColors.inactive.icon : stateColors.active.icon}
                glow={!isOff() ? stateColors.active.glow : undefined}
                entityCount={entities().length}
              />
              <div class="flex flex-col gap-1 overflow-hidden">
                <Widget.Title>
                  {props.config.title || entity()?.friendlyName || "Climate"}
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
        title="Climate"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<ClimateControls entities={entities} />}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<ClimateConfig>({
  manifest: {
    name: "Climate",
    description: "Climate control with temperature, HVAC modes, and fan control",
    icon: "mdi:thermostat",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: ClimateWidget,
});
