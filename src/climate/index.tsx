import { useEntities } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  isDark,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { ClimateControls } from "./controls";
// Climate-scoped channel transition (--widget-color 300ms ease) — see transition.css
import "./transition.css";
import { formatTemperature, getHvacModeIcon, getModeColors, HVAC_MODES } from "./utils";

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
  // isDark() is called inside the memo so re-evaluation on mode() change
  // also re-reads the theme; live theme-toggle without a mode change picks up
  // on next memo invalidation (acceptable per CONTEXT D-10 / T-29-04).
  const mode = createMemo(() => getModeColors(hvacMode(), isDark()));

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
      hold: { action: openDialog },
    }),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents);
  });
  const debugView = createMemo(() => {
    const dbg = debugData();
    return dbg ? <WidgetDebugView data={dbg} /> : undefined;
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        color={mode().color}
        colorTo={mode().colorTo}
        emptyState={emptyState()}
        class="climate-widget-shell"
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={iconName()} />}
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
        debugContent={debugView()}
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
    sdkVersion: "^0.5.0",
  },
  configSchema,
  component: ClimateWidget,
});
