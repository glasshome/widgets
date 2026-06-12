import { type JSX, Match, Show, Switch } from "solid-js";

export type EnergyEmptyStateKind = "unconfigured" | "unavailable" | "first-day";

export interface EnergyEmptyStateProps {
  kind: EnergyEmptyStateKind;
  lastKnownValue?: string;
  onConfigure?: () => void;
}

export function EnergyEmptyState(props: EnergyEmptyStateProps): JSX.Element {
  return (
    <Switch>
      <Match when={props.kind === "unconfigured"}>
        {/* No glyph: the widget header above already carries the house icon. */}
        <div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <div class="flex flex-col gap-1">
            <p class="font-medium text-foreground text-sm">Set up your energy sensors</p>
            <p class="text-muted-foreground text-xs">
              Connect your solar, grid, and battery to see your home's energy at a glance.
            </p>
          </div>
          <Show when={props.onConfigure}>
            <button
              type="button"
              class="flex min-h-[44px] cursor-pointer items-center justify-center rounded-lg border border-border px-4 text-sm transition-colors hover:bg-muted"
              onClick={() => props.onConfigure?.()}
            >
              Configure
            </button>
          </Show>
        </div>
      </Match>

      <Match when={props.kind === "unavailable"}>
        <div class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <span class="font-medium text-foreground text-sm opacity-60">
            {props.lastKnownValue}
          </span>
          <span class="rounded-full bg-muted px-2 py-0.5 text-muted-foreground text-xs">
            Reconnecting...
          </span>
        </div>
      </Match>

      <Match when={props.kind === "first-day"}>
        <div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <div class="flex flex-col gap-1">
            <p class="font-medium text-foreground text-sm">Check back tomorrow</p>
            <p class="text-muted-foreground text-xs">Your energy history is being recorded</p>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
