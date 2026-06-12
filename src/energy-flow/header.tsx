import { Widget } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { type JSX, Show } from "solid-js";
import { energyIcons } from "../_energy-shared/icons";

/**
 * Standard widget header for the energy-flow widget: SDK icon tile + title +
 * optional detail line. The title carries the live flow headline ("Solar is
 * powering your home"); empty states pass a static title instead so the widget
 * keeps its identity. The tile picks up the shell's channel color (dominant
 * source) via the SDK's --widget-color.
 */
export function EnergyHeader(props: {
  headline: string;
  detail?: string;
  dimmed?: boolean;
}): JSX.Element {
  return (
    <div class="flex min-w-0 shrink-0 items-center gap-3">
      <Widget.Icon icon={<Icon icon={energyIcons.home} />} dimmed={props.dimmed} />
      <div class="flex min-w-0 flex-col overflow-hidden">
        <Widget.Title>{props.headline}</Widget.Title>
        <Show when={props.detail}>
          <span class="truncate text-xs text-foreground/50">{props.detail}</span>
        </Show>
      </div>
    </div>
  );
}
