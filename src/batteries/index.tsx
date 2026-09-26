import {
  buildDebugData,
  byDomain,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useEntities,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, Index, onCleanup } from "solid-js";
import { widgetDialogProps } from "../common";
import { Tile, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import "./batteries.css";
import { BatteriesSheet } from "./sheet";
import { filterAndSortBatteries, getBatteryColor, getBatteryIcon } from "./utils";

const configSchema = defineConfig({
  title: field.title(),
  threshold: field.number({ title: "Low Battery Threshold (%)", min: 0, max: 100, default: 20 }),
  whitelist: field.stringList({ title: "Whitelist (include only these)" }),
  blacklist: field.stringList({ title: "Blacklist (exclude these)" }),
});
type BatteriesConfig = Infer<typeof configSchema>;

function BatteriesWidget(props: { config: BatteriesConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const sensorIds = createMemo(() => byDomain().sensor ?? []);
  const sensorEntities = useEntities(sensorIds);

  const batteries = createMemo(() => filterAndSortBatteries(sensorEntities(), props.config));

  const lowCount = createMemo(() => batteries().filter((b) => b.isLow).length);
  const totalCount = createMemo(() => batteries().length);
  const hasLow = createMemo(() => lowCount() > 0);

  const gestures = useWidgetGestures(() => ({
    hold: totalCount() > 0 ? { action: openDialog } : undefined,
  }));
  onCleanup(gestures.dispose);

  const lowestLevel = () => batteries()[0]?.level;

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = sensorEntities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      batteryCount: totalCount(),
      lowCount: lowCount(),
    });
  });

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" tone={hasLow() ? "warning" : "success"}>
        <Tile active={hasLow()}>
          <TileGlyph icon={hasLow() ? "mdi:battery-alert" : "mdi:battery"} />
          <TileHead
            icon={hasLow() ? "mdi:battery-alert" : "mdi:battery"}
            eyebrow={`${totalCount()} batteries`}
            name={props.config.title || "Batteries"}
            active={hasLow()}
          />
          <TileHero
            value={lowestLevel() ?? "--"}
            unit={lowestLevel() === undefined ? undefined : "%"}
            sub={hasLow() ? `${lowCount()} low` : "All good"}
            art={
              <div class="batteries-list">
                <Index each={batteries().slice(0, 4)}>
                  {(battery) => (
                    <div class="batteries-row">
                      <Icon
                        icon={getBatteryIcon(battery().level)}
                        width={16}
                        style={{ color: getBatteryColor(battery().level) }}
                      />
                      <span class="batteries-name">
                        {battery().entity.friendlyName || battery().entity.id}
                      </span>
                      <span
                        class="batteries-level"
                        style={{ color: getBatteryColor(battery().level) }}
                      >
                        {battery().level}%
                      </span>
                    </div>
                  )}
                </Index>
              </div>
            }
          />
        </Tile>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={props.config.title || "Batteries"}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(totalCount() > 0
          ? {
              sheet: (
                <BatteriesSheet batteries={batteries()} threshold={props.config.threshold ?? 20} />
              ),
            }
          : {})}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<BatteriesConfig>({
  manifest: {
    name: "Batteries",
    description: "Auto-discover and monitor battery levels across all devices",
    icon: "mdi:battery",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "All good",
        size: {
          w: 2,
          h: 2,
        },
        config: {
          title: "Batteries",
          threshold: 20,
          whitelist: [],
          blacklist: [],
        },
      },
      {
        label: "One running low",
        size: {
          w: 2,
          h: 2,
        },
        config: {
          title: "Batteries",
          threshold: 70,
          whitelist: [],
          blacklist: [],
        },
      },
      {
        label: "Batteries",
        size: {
          w: 2,
          h: 3,
        },
        config: {
          title: "Batteries",
          threshold: 20,
          whitelist: [],
          blacklist: [],
        },
      },
      {
        label: "Every battery",
        size: {
          w: 4,
          h: 4,
        },
        config: {
          title: "Batteries",
          threshold: 70,
          whitelist: [],
          blacklist: [],
        },
      },
    ],
  },
  configSchema,
  component: BatteriesWidget,
});
