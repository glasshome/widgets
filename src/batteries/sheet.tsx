import {
  type PanelFact,
  PanelFacts,
  PanelRow,
  PanelRows,
  PanelSection,
  useTranslation,
} from "@glasshome/widget-sdk";
import { For } from "solid-js";
import {
  type BatteryDevice,
  batteryName,
  batteryPercent,
  getBatteryColor,
  getBatteryIcon,
} from "./utils";

export function BatteriesSheet(props: { batteries: BatteryDevice[]; threshold: number }) {
  const tools = useTranslation();
  const facts = (): PanelFact[] => {
    const low = props.batteries.filter((b) => b.isLow).length;
    const silent = props.batteries.filter((b) => !b.isAvailable).length;
    const out: PanelFact[] = [
      {
        icon: "mdi:battery",
        label: tools.t("batteries.sheet.batteries"),
        value: tools.formatNumber(props.batteries.length),
      },
      {
        icon: "mdi:battery-alert",
        label: tools.t("batteries.sheet.below", { threshold: props.threshold }),
        value: low === 0 ? tools.t("batteries.sheet.none") : tools.formatNumber(low),
      },
    ];
    if (silent > 0)
      out.push({
        icon: "mdi:battery-unknown",
        label: tools.t("batteries.sheet.not-reporting"),
        value: tools.formatNumber(silent),
      });
    return out;
  };

  return (
    <>
      <PanelSection label={tools.t("batteries.sheet.overview")}>
        <PanelFacts items={facts()} />
      </PanelSection>
      <PanelSection label={tools.t("batteries.sheet.lowest-first")}>
        <PanelRows>
          <For each={props.batteries}>
            {(b) => (
              <PanelRow
                icon={getBatteryIcon(b.level)}
                name={batteryName(b.entity)}
                state={
                  b.isAvailable
                    ? batteryPercent(tools, b.level)
                    : tools.t("batteries.sheet.not-reporting")
                }
                tone={getBatteryColor(b.level)}
                on={b.isAvailable}
                fill={b.level}
              />
            )}
          </For>
        </PanelRows>
      </PanelSection>
    </>
  );
}
