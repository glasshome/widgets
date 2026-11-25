import {
  type EntityView,
  PanelEntityRow,
  PanelRow,
  PanelRows,
  PanelSection,
  useService,
  useTranslation,
} from "@glasshome/widget-sdk";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { getCoverCapabilities, getCoverTiltPosition } from "./cover-entity";

const hasSlats = (e: EntityView | undefined) => {
  const caps = getCoverCapabilities(e);
  return caps.canSetTiltPosition || caps.canOpenTilt || caps.canCloseTilt;
};

export const coverHasExtras = (entities: EntityView[]) =>
  entities.length > 1 || hasSlats(entities[0]);

/** What the cover tile cannot show: each cover of a group, one at a time, or a single cover's slats. */
export function CoverSheet(props: { entities: EntityView[]; name: string }) {
  const { t } = useTranslation();
  return (
    <Show
      when={props.entities.length > 1}
      fallback={<Show when={props.entities[0]}>{(e) => <SlatsSection entity={e()} />}</Show>}
    >
      <PanelSection label={t("cover.sheet.covers")}>
        <PanelRows>
          <For each={props.entities}>
            {(e) => <PanelEntityRow entityId={e.id} within={props.name} />}
          </For>
        </PanelRows>
      </PanelSection>
    </Show>
  );
}

function SlatsSection(props: { entity: EntityView }) {
  const { t, formatNumber } = useTranslation();
  const { callService } = useService();
  const caps = createMemo(() => getCoverCapabilities(props.entity));
  const tilt = createMemo(() => getCoverTiltPosition(props.entity));
  const [dragged, setDragged] = createSignal<number>();
  createEffect(() => {
    tilt();
    setDragged(undefined);
  });
  const shown = () => dragged() ?? tilt() ?? 0;
  const target = () => ({ entity_id: props.entity.id });
  const tiltBy = (service: "open_cover_tilt" | "close_cover_tilt") =>
    void callService("cover", service, {}, target());

  return (
    <PanelSection label={t("cover.sheet.slats")}>
      <Show
        when={caps().canSetTiltPosition && tilt() !== null}
        fallback={
          <PanelRows>
            <Show when={caps().canOpenTilt}>
              <PanelRow
                icon="mdi:blinds-horizontal"
                name={t("cover.sheet.open-slats")}
                on={false}
                onTap={() => tiltBy("open_cover_tilt")}
              />
            </Show>
            <Show when={caps().canCloseTilt}>
              <PanelRow
                icon="mdi:blinds-horizontal-closed"
                name={t("cover.sheet.close-slats")}
                on={false}
                onTap={() => tiltBy("close_cover_tilt")}
              />
            </Show>
          </PanelRows>
        }
      >
        <PanelRows>
          <PanelRow
            icon={shown() > 0 ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed"}
            name={t("cover.sheet.tilt")}
            state={formatNumber(shown() / 100, { style: "percent" })}
            tone="var(--tone-info)"
            on={shown() > 0}
            slide={{
              value: shown(),
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
