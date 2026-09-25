import {
  Button,
  type EntityView,
  PanelEntityRow,
  PanelRow,
  PanelRows,
  PanelSection,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { getCoverIcon } from "../common";
import { CoverArt, type CoverKind } from "../common/art/cover";
import { coverJoinsBulk, groupLine } from "../common/group";
import {
  getCoverCapabilities,
  getCoverPosition,
  getCoverStatusText,
  getCoverTiltPosition,
  isCoverMoving,
  isCoverOpen,
} from "./cover-entity";

/** The cover, held: its window big, a drag anywhere to move it, and every member of a group. */
export function CoverPanel(props: { entities: EntityView[]; name: string; kind: CoverKind }) {
  const { callService } = useService();

  const primary = () => props.entities[0];
  const count = () => props.entities.length;
  const ids = () => props.entities.map((e) => e.id);
  const isOpen = () => props.entities.some(isCoverOpen);
  const openCount = () => props.entities.filter(isCoverOpen).length;
  const actsInBulk = () => count() <= 1 || props.entities.every(coverJoinsBulk);
  const caps = createMemo(() => getCoverCapabilities(primary()));
  const position = createMemo(() => getCoverPosition(primary()));

  const [dragged, setDragged] = createSignal<number>();
  createEffect(() => {
    position();
    setDragged(undefined);
  });
  const shown = () => dragged() ?? position() ?? (isOpen() ? 100 : 0);
  const canSlide = () => actsInBulk() && caps().canSetPosition && position() !== null;

  const setPosition = (value: number) => {
    const targets = props.entities
      .filter((e) => getCoverCapabilities(e).canSetPosition)
      .map((e) => e.id);
    if (targets.length > 0)
      void callService("cover", "set_cover_position", { position: value }, { entity_id: targets });
  };
  const move = (service: "open_cover" | "stop_cover" | "close_cover") =>
    void callService("cover", service, {}, { entity_id: ids() });

  const hasSlats = () =>
    count() === 1 && (caps().canSetTiltPosition || caps().canOpenTilt || caps().canCloseTilt);

  const single = () => (count() === 1 ? primary() : undefined);
  const assumed = () => single()?.attributes.assumed_state === true;
  const moving = () => {
    const e = single();
    return !e || isCoverMoving(e);
  };
  const openDisabled = () => !!single() && !assumed() && !moving() && shown() >= 100;
  const closeDisabled = () =>
    !!single() && !assumed() && !moving() && primary()?.state === "closed";
  const stopDisabled = () => !!single() && !assumed() && !moving();

  const value = () => {
    if (dragged() !== undefined || (count() === 1 && position() !== null && !moving())) {
      return (
        <>
          {shown()}
          <small>%</small>
        </>
      );
    }
    if (count() > 1) return isOpen() ? "Open" : "Closed";
    return getCoverStatusText(primary(), null);
  };
  const eyebrow = () => {
    if (count() > 1) return groupLine(openCount(), count(), { active: "open", rest: "closed" });
    const pos = position();
    if (pos === null) return undefined;
    return pos === 0 ? "Closed" : pos === 100 ? "Open" : "Partly open";
  };

  return (
    <WidgetPanel
      icon={getCoverIcon(isOpen(), primary()?.deviceClass ?? null)}
      tone={isOpen() ? "var(--tone-info)" : "var(--tone-neutral)"}
      eyebrow={eyebrow()}
      name={props.name}
      art={<CoverArt kind={props.kind} closed={100 - shown()} />}
      hint={canSlide() ? "Drag anywhere to move it" : undefined}
      value={value()}
      caption={actsInBulk() ? undefined : "Doors and gates move one at a time"}
      slide={
        canSlide() ? { value: shown(), onChange: setDragged, onCommit: setPosition } : undefined
      }
      actions={
        actsInBulk() ? (
          <>
            <Show when={caps().canOpen}>
              <Button
                variant="outline"
                disabled={openDisabled()}
                onClick={() => move("open_cover")}
              >
                <Icon icon="mdi:arrow-up" width={18} />
                Open
              </Button>
            </Show>
            <Show when={caps().canStop}>
              <Button
                variant="outline"
                disabled={stopDisabled()}
                onClick={() => move("stop_cover")}
              >
                <Icon icon="mdi:stop" width={18} />
                Stop
              </Button>
            </Show>
            <Show when={caps().canClose}>
              <Button
                variant="outline"
                disabled={closeDisabled()}
                onClick={() => move("close_cover")}
              >
                <Icon icon="mdi:arrow-down" width={18} />
                Close
              </Button>
            </Show>
          </>
        ) : undefined
      }
    >
      {count() > 1 ? (
        <PanelSection label="Covers">
          <PanelRows>
            <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
          </PanelRows>
        </PanelSection>
      ) : hasSlats() ? (
        <SlatsSection entity={primary()} />
      ) : undefined}
    </WidgetPanel>
  );
}

function SlatsSection(props: { entity: EntityView }) {
  const { callService } = useService();
  const caps = createMemo(() => getCoverCapabilities(props.entity));
  const tilt = createMemo(() => getCoverTiltPosition(props.entity));
  const [dragged, setDragged] = createSignal<number>();
  createEffect(() => {
    tilt();
    setDragged(undefined);
  });
  const target = () => ({ entity_id: props.entity.id });
  const tiltBy = (service: "open_cover_tilt" | "stop_cover_tilt" | "close_cover_tilt") =>
    void callService("cover", service, {}, target());

  return (
    <PanelSection label="Slats">
      <Show
        when={caps().canSetTiltPosition && tilt() !== null}
        fallback={
          <PanelRows>
            <Show when={caps().canOpenTilt}>
              <PanelRow
                icon="mdi:blinds-horizontal"
                name="Open slats"
                on={false}
                onTap={() => tiltBy("open_cover_tilt")}
              />
            </Show>
            <Show when={caps().canCloseTilt}>
              <PanelRow
                icon="mdi:blinds-horizontal-closed"
                name="Close slats"
                on={false}
                onTap={() => tiltBy("close_cover_tilt")}
              />
            </Show>
          </PanelRows>
        }
      >
        <PanelRows>
          <PanelRow
            icon={
              (dragged() ?? tilt() ?? 0) > 0
                ? "mdi:blinds-horizontal"
                : "mdi:blinds-horizontal-closed"
            }
            name="Tilt"
            state={`${dragged() ?? tilt() ?? 0}%`}
            tone="var(--tone-info)"
            on={(dragged() ?? tilt() ?? 0) > 0}
            slide={{
              value: dragged() ?? tilt() ?? 0,
              onChange: setDragged,
              onCommit: (v) =>
                void callService(
                  "cover",
                  "set_cover_tilt_position",
                  { tilt_position: v },
                  target(),
                ),
            }}
            onTap={() => tiltBy((tilt() ?? 0) > 0 ? "close_cover_tilt" : "open_cover_tilt")}
          />
        </PanelRows>
      </Show>
    </PanelSection>
  );
}
