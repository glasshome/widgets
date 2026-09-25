import { type EntityView, PanelEntityRow, PanelRows, PanelSection } from "@glasshome/widget-sdk";
import { For } from "solid-js";

/** What a switch group's tile cannot show: each switch in it. */
export function SwitchSheet(props: { entities: EntityView[]; name: string }) {
  return (
    <PanelSection label="Switches">
      <PanelRows>
        <For each={props.entities}>
          {(e) => <PanelEntityRow entityId={e.id} within={props.name} />}
        </For>
      </PanelRows>
    </PanelSection>
  );
}
