import { Button, Icon } from "@glasshome/widget-sdk";
import { Index, Show } from "solid-js";
import type { ResolvedChip } from "./items";

type ChipService = NonNullable<ResolvedChip["service"]>;

/** Keyed by position, so a new array of chips updates each chip's fields in place. */
export function HeaderChips(props: {
  chips: ResolvedChip[];
  run: (service: ChipService, ids: string[]) => void;
}) {
  return (
    <div class="header-chips">
      <Index each={props.chips}>
        {(chip) => (
          <Button
            as={chip().service ? "button" : "span"}
            variant="outline"
            size="none"
            type={chip().service ? "button" : undefined}
            class={`header-chip ${chip().service ? "" : "cursor-default"}`}
            aria-label={chip().label}
            onClick={() => {
              const { service, ids } = chip();
              if (service) props.run(service, ids);
            }}
          >
            <Icon icon={chip().icon} width={18} height={18} class={chip().tone} />
            <Show when={chip().value}>
              <span class="header-chip-value">{chip().value}</span>
            </Show>
          </Button>
        )}
      </Index>
    </div>
  );
}
