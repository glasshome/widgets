import { useWidgetContext, Widget } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Match, Switch } from "solid-js";
import type { FlowDescription } from "../_energy-shared";
import { formatPower } from "../_energy-shared";
import { energyIcons } from "../_energy-shared/icons";
import type { Tariff } from "./cost";
import { isIdle, type ResolvedFlow } from "./flow";
import { EnergyHeader } from "./header";
import { selectTier } from "./layout";
import { SourceMix } from "./mix-bar";
import { NodeDetail } from "./node-detail";
import { Spine } from "./spine";

interface EnergyContentProps {
  flow: ResolvedFlow;
  description: FlowDescription;
  tariff: Tariff;
  title: string;
}

export function EnergyContent(props: EnergyContentProps) {
  const ctx = useWidgetContext();

  const [openNode, setOpenNode] = createSignal<string | null>(null);

  const tier = createMemo(() => {
    const d = ctx.dimensions();
    return selectTier(d.width, d.height);
  });

  // Nothing meaningfully flowing → the header tile dims like other widgets'
  // off states.
  const idle = createMemo(() => isIdle(props.flow));

  return (
    <div class="relative h-full w-full">
      <Switch>
        {/* --- Glance: header row only, like any 2x1 widget --- */}
        <Match when={tier() === "glance"}>
          <div class="flex h-full min-h-0 items-center gap-3">
            <Widget.Icon icon={<Icon icon={energyIcons.home} />} dimmed={idle()} />
            <div class="flex min-w-0 flex-col overflow-hidden">
              <Widget.Title>{props.description.headline}</Widget.Title>
              <Widget.Status class="tabular-nums">{formatPower(props.flow.hubW)}</Widget.Status>
            </div>
          </div>
        </Match>

        {/* --- Mid: header + home draw + supply-mix bar --- */}
        <Match when={tier() === "mid"}>
          <div class="flex h-full min-h-0 flex-col justify-between gap-2">
            <EnergyHeader
              headline={props.title}
              detail={props.description.headline}
              dimmed={idle()}
            />
            <div class="flex min-w-0 flex-col gap-2">
              <div class="flex items-baseline gap-1.5">
                <Widget.Status class="tabular-nums">{formatPower(props.flow.hubW)}</Widget.Status>
                <span class="text-foreground/50 text-xs">home</span>
              </div>
              <SourceMix flow={props.flow} tariff={props.tariff} />
            </div>
          </div>
        </Match>

        {/* --- Full: header + the source → home → spend spine --- */}
        <Match when={tier() === "full"}>
          <div class="flex h-full min-h-0 flex-col gap-1">
            <EnergyHeader
              headline={props.title}
              detail={props.description.headline}
              dimmed={idle()}
            />
            <div class="min-h-0 flex-1">
              <Spine flow={props.flow} tariff={props.tariff} onTap={setOpenNode} />
            </div>
          </div>
        </Match>
      </Switch>

      <NodeDetail
        flow={props.flow}
        tariff={props.tariff}
        node={openNode()}
        onClose={() => setOpenNode(null)}
      />
    </div>
  );
}
