import { Button, Icon } from "@glasshome/widget-sdk";
import { type Accessor, For, Show } from "solid-js";
import type { ResolvedChip } from "./items";

type ChipService = NonNullable<ResolvedChip["service"]>;

function ChipFace(props: { chip: ResolvedChip }) {
  return (
    <>
      <Icon icon={props.chip.icon} width={18} height={18} class={props.chip.tone} />
      <Show when={props.chip.value}>
        <span class="header-chip-value">{props.chip.value}</span>
      </Show>
    </>
  );
}

function ActionChip(props: {
  chip: ResolvedChip;
  run: (service: ChipService, ids: string[]) => void;
}) {
  return (
    <Button
      variant="outline"
      size="none"
      type="button"
      class="header-chip"
      aria-label={props.chip.label}
      onClick={() => {
        const { service, ids } = props.chip;
        if (service) props.run(service, ids);
      }}
    >
      <ChipFace chip={props.chip} />
    </Button>
  );
}

function ReadingChip(props: { chip: ResolvedChip }) {
  return (
    <Button
      as="span"
      variant="outline"
      size="none"
      class="header-chip cursor-default"
      aria-label={props.chip.label}
    >
      <ChipFace chip={props.chip} />
    </Button>
  );
}

/** Keyed by position, so a new array of chips updates each chip's fields in place. */
export function HeaderChips(props: {
  chips: ResolvedChip[];
  run: (service: ChipService, ids: string[]) => void;
}) {
  // Button reads its element's tag once, so a chip that changes kind mounts the other kind.
  const chip = (at: Accessor<ResolvedChip>) => (
    <Show when={at().service} fallback={<ReadingChip chip={at()} />}>
      <ActionChip chip={at()} run={props.run} />
    </Show>
  );
  return (
    <div class="header-chips">
      <For keyed={false} each={props.chips}>
        {chip}
      </For>
    </div>
  );
}
