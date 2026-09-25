import {
  Button,
  Icon,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { For, Show } from "solid-js";
import type { ResolvedChip } from "./items";

/** A counting chip opened up: every device it counts, and its one-tap action while any is active. */
export interface HeaderGroup {
  label: string;
  /** "3 lights on", or undefined when none is. */
  summary?: string;
  ids: string[];
  bulk: ResolvedChip | null;
}

/** The header, held: the greeting and the dashboard's name, and each chip opened into its devices. */
export function HeaderPanel(props: {
  icon: string;
  greeting?: string;
  name: string;
  groups: HeaderGroup[];
  runs: string[];
  readings: PanelFact[];
  onBulk: (chip: ResolvedChip) => void;
}) {
  const bulk = () => props.groups.flatMap((g) => (g.bulk ? [g.bulk] : []));
  const summary = () =>
    props.groups.flatMap((g) => (g.summary ? [g.summary] : [])).join(" · ") || undefined;

  return (
    <WidgetPanel
      icon={props.icon}
      eyebrow={props.greeting}
      name={props.name}
      caption={summary()}
      actions={
        <Show when={bulk().length}>
          <For each={bulk()}>
            {(chip) => (
              <Button variant="outline" onClick={() => props.onBulk(chip)}>
                <Icon icon={chip.icon} width={18} />
                {chip.label}
              </Button>
            )}
          </For>
        </Show>
      }
    >
      {props.groups.some((g) => g.ids.length) || props.runs.length || props.readings.length ? (
        <>
          <For each={props.groups}>
            {(group) => (
              <Show when={group.ids.length}>
                <PanelSection label={group.label}>
                  <PanelRows>
                    <For each={group.ids}>{(id) => <PanelEntityRow entityId={id} />}</For>
                  </PanelRows>
                </PanelSection>
              </Show>
            )}
          </For>
          <Show when={props.runs.length}>
            <PanelSection label="Run">
              <PanelRows>
                <For each={props.runs}>{(id) => <PanelEntityRow entityId={id} />}</For>
              </PanelRows>
            </PanelSection>
          </Show>
          <Show when={props.readings.length}>
            <PanelSection label="Readings">
              <PanelFacts items={props.readings} />
            </PanelSection>
          </Show>
        </>
      ) : undefined}
    </WidgetPanel>
  );
}
