import { Badge, Button, useTranslation } from "@glasshome/widget-sdk";
import { type JSX, Match, Show, Switch } from "solid-js";

type EnergyEmptyStateKind = "unconfigured" | "unavailable" | "first-day";

export interface EnergyEmptyStateProps {
  kind: EnergyEmptyStateKind;
  lastKnownValue?: string;
  onConfigure?: () => void;
}

export function EnergyEmptyState(props: EnergyEmptyStateProps): JSX.Element {
  const { t } = useTranslation();
  return (
    <Switch>
      <Match when={props.kind === "unconfigured"}>
        {/* No glyph: the widget header above already carries the house icon. */}
        <div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <div class="flex flex-col gap-1">
            <p class="text-foreground text-sm font-medium">{t("energy.empty.title")}</p>
            <p class="text-muted-foreground text-xs">{t("energy.empty.message")}</p>
          </div>
          <Show when={props.onConfigure}>
            <Button variant="outline" size="sm" onClick={() => props.onConfigure?.()}>
              {t("energy.empty.configure")}
            </Button>
          </Show>
        </div>
      </Match>

      <Match when={props.kind === "unavailable"}>
        <div class="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <span class="text-foreground text-sm font-medium opacity-60">{props.lastKnownValue}</span>
          <Badge>{t("energy.empty.reconnecting")}</Badge>
        </div>
      </Match>

      <Match when={props.kind === "first-day"}>
        <div class="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
          <div class="flex flex-col gap-1">
            <p class="text-foreground text-sm font-medium">{t("energy.empty.first-day-title")}</p>
            <p class="text-muted-foreground text-xs">{t("energy.empty.first-day-message")}</p>
          </div>
        </div>
      </Match>
    </Switch>
  );
}
