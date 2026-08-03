import {
  defineConfig,
  defineWidget,
  field,
  type Infer,
  isDark,
  useEntities,
  useTemperatureUnit,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, formatTemperature, WidgetDebugView, widgetDialogProps } from "../common";
import "../common/mode-transition.css";
import { WaterHeaterControls } from "./controls";
import { getModeColors, OPERATION_MODES } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("water_heater"),
});
type WaterHeaterConfig = Infer<typeof configSchema>;

function WaterHeaterWidget(props: { config: WaterHeaterConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);

  const { emptyState, hasEntities } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:water-boiler" width={32} />,
      title: "No water heater entity",
      message: "Hold to configure",
    },
  });

  const entity = createMemo(() => entities()[0]);
  // Water heater state IS the operation mode (off/eco/electric/gas/heat_pump/...).
  const operationMode = createMemo(() => (entity()?.state ?? "off") as string);
  const isUnavailable = createMemo(
    () => operationMode() === "unavailable" || operationMode() === "unknown",
  );

  const currentTemp = createMemo(
    () => entity()?.attributes?.current_temperature as number | undefined,
  );
  const temperatureUnit = useTemperatureUnit();
  const tempUnit = createMemo(() => temperatureUnit().replace("°", ""));

  // isDark() is read inside the memo so a mode change also re-reads the theme.
  const mode = createMemo(() => getModeColors(isUnavailable() ? "off" : operationMode(), isDark()));

  const statusText = createMemo(() => {
    if (isUnavailable()) return "Unavailable";
    const label = OPERATION_MODES[operationMode()]?.label ?? operationMode();
    const ct = currentTemp();
    if (ct === undefined) return label;
    return `${label} - ${formatTemperature(ct, tempUnit())}`;
  });

  const gestures = useWidgetGestures(() => ({
    hold: { action: openDialog },
  }));
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
        class="widget-mode-transition"
      >
        <Show when={hasEntities()}>
          <Widget.Content>
            <Widget.Icon icon={<Icon icon="mdi:water-boiler" />} entityCount={entities().length} />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title || entity()?.friendlyName || "Water Heater"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Water Heater"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={<WaterHeaterControls entities={entities} />}
        debugContent={debugView()}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<WaterHeaterConfig>({
  manifest: {
    name: "Water Heater",
    description: "Water heater control with target temperature and operation modes",
    icon: "mdi:water-boiler",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.4.0",
    examples: [
      {
        label: "Eco",
        size: { w: 2, h: 2 },
        config: { entityIds: ["water_heater.boiler"], title: "Boiler" },
      },
      {
        label: "Heat pump",
        size: { w: 2, h: 2 },
        config: { entityIds: ["water_heater.heat_pump_tank"] },
      },
    ],
  },
  configSchema,
  component: WaterHeaterWidget,
});
