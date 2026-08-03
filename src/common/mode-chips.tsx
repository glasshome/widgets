import { Icon } from "@iconify-icon/solid";
import { For, Show } from "solid-js";
import "./controls.css";

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
          <button
            type="button"
            onClick={() => props.onSelect(mode)}
            class="flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-xs transition-colors"
            classList={{
              "bg-primary text-primary-foreground": props.active === mode,
              "mode-chip bg-muted": props.active !== mode,
              capitalize: props.capitalize,
            }}
          >
            <Show when={iconFor(mode)}>{(icon) => <Icon icon={icon()} width={16} />}</Show>
            {labelFor(mode)}
          </button>
        )}
      </For>
    </div>
  );
}
