import { Button } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";

interface ModeChipsProps {
  modes: string[];
  active: string | undefined;
  info?: Record<string, { icon: string; label: string }>;
  /** Icon when info misses a mode. With neither info nor fallbackIcon, no icon renders. */
  fallbackIcon?: string;
  /** Raw mode strings as labels, capitalized (preset-style rows). */
  capitalize?: boolean;
  onSelect: (mode: string) => void;
}

export function ModeChips(props: ModeChipsProps) {
  const iconFor = (mode: string) => props.info?.[mode]?.icon ?? props.fallbackIcon;
  const labelFor = (mode: string) => props.info?.[mode]?.label ?? mode;

  return (
    <div class="flex flex-wrap gap-2">
      <For each={props.modes}>
        {(mode) => (
          <Button
            variant={props.active === mode ? "default" : "outline"}
            size="sm"
            class={props.capitalize ? "text-xs capitalize" : "text-xs"}
            onClick={() => props.onSelect(mode)}
          >
            <Show when={iconFor(mode)}>{(icon) => <Icon icon={icon()} width={16} />}</Show>
            {labelFor(mode)}
          </Button>
        )}
      </For>
    </div>
  );
}
