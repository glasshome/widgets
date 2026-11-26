import { type EntityView, PanelEntityRow, PanelRows, PanelSection } from "@glasshome/widget-sdk";
import { Index } from "solid-js";

/** What a switch group's tile cannot show: each switch in it. */
export function SwitchSheet(props: { entities: EntityView[]; name: string }) {
  return (
    <PanelSection label="Switches">
      <PanelRows>
        <Index each={props.entities}>
          {(e) => <PanelEntityRow entityId={e().id} within={props.name} />}
        </Index>
      </PanelRows>
    </PanelSection>
  );
}
