import {
  type EntityView,
  PanelEntityRow,
  type PanelFact,
  PanelFacts,
  PanelRows,
  PanelSection,
  type TranslationTools,
  useTranslation,
} from "@glasshome/widget-sdk";
import { createMemo, For, Show } from "solid-js";

const at = (tools: TranslationTools, date: Date) => {
  if (Number.isNaN(date.getTime())) return undefined;
  const time = tools.formatDate(date, { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === new Date().toDateString()) return time;
  const day = tools.formatDate(date, { month: "short", day: "numeric" });
  return tools.t("lock.sheet.changed-at", { day, time });
};

/** What a group of locks cannot show on its tile: each door on its own row, and when each changed. */
export function LockSheet(props: { entities: EntityView[] }) {
  const tools = useTranslation();
  const { t } = tools;
  const facts = createMemo((): PanelFact[] =>
    props.entities.flatMap((e) => {
      const when = at(tools, e.lastChanged);
      if (!when) return [];
      return [
        {
          icon: e.state === "locked" ? "mdi:lock" : "mdi:lock-open-variant",
          label: e.friendlyName,
          value: when,
        },
      ];
    }),
  );

  return (
    <>
      <PanelSection label={t("lock.sheet.doors")}>
        <PanelRows>
          <For each={props.entities}>{(e) => <PanelEntityRow entityId={e.id} />}</For>
        </PanelRows>
      </PanelSection>
      <Show when={facts().length}>
        <PanelSection label={t("lock.sheet.last-changed")}>
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </>
  );
}
