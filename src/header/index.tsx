import {
  Button,
  byDomain,
  defineWidget,
  SectionIcon,
  SectionTitle,
  useArea,
  useService,
  useStore,
  useWidgetContext,
  useWidgetDashboard,
  useWidgetDialog,
  useWidgetDimensions,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { configSchema, type HeaderChip, type HeaderConfig } from "./config";
import { type EntitySnapshot, needsArea, resolveChip, visibleCount } from "./items";

function HeaderWidget(props: { config: HeaderConfig }) {
  const ctx = useWidgetContext();
  const dashboard = useWidgetDashboard();
  const { callService } = useService();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  const areaId = createMemo(() => {
    const where = props.config.where;
    if (where.scope === "area") return where.areaId ?? "";
    if (where.scope === "dashboard") return dashboard().areaId ?? "";
    return "";
  });
  const area = useArea(areaId);
  const entities = useStore((s) => s.entities);

  const snapshot = (chip: HeaderChip): EntitySnapshot[] => {
    const all = entities();
    const ids =
      chip.shows === "watch"
        ? areaId()
          ? (area()?.entityIds ?? [])
          : (byDomain()[chip.domain] ?? [])
        : chip.entityId;
    return ids.flatMap((id) => {
      const e = all[id];
      if (!e) return [];
      return [
        {
          id,
          state: e.state,
          name: e.attributes?.friendly_name as string | undefined,
          unit: e.attributes?.unit_of_measurement as string | undefined,
          icon: e.attributes?.icon as string | undefined,
        },
      ];
    });
  };

  const chips = createMemo(() => {
    if (needsArea(props.config.where)) return [];
    return props.config.chips.flatMap((chip) => {
      const r = resolveChip(chip as never, snapshot(chip));
      return r ? [r] : [];
    });
  });

  const Chips = () => {
    const dimensions = useWidgetDimensions();
    const shown = createMemo(() => chips().slice(0, visibleCount(dimensions().width, chips().length)));
    return (
      <div class="flex shrink-0 items-center gap-1.5">
        <For each={shown()}>
          {(chip) => (
            <Button
              variant="secondary"
              size="none"
              type="button"
              class="h-10 min-w-10 gap-1.5 px-3"
              aria-label={chip.label}
              disabled={!chip.service}
              onClick={() => {
                if (chip.service) void callService(chip.service.domain, chip.service.name, {}, { entity_id: chip.ids });
              }}
            >
              <Icon icon={chip.icon} width={16} height={16} class={chip.tone} />
              <Show when={chip.value}>
                <span class="font-semibold text-[15px] text-foreground tabular-nums">{chip.value}</span>
              </Show>
            </Button>
          )}
        </For>
      </div>
    );
  };

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass">
        <div class="flex h-full min-w-0 items-center gap-3 px-4">
          <SectionIcon size="sm">
            <Icon icon={props.config.icon || dashboard().icon || "mdi:view-dashboard"} />
          </SectionIcon>
          <SectionTitle class="min-w-0 flex-1 truncate">
            {props.config.title || dashboard().name || "Dashboard"}
          </SectionTitle>
          <Chips />
        </div>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Header"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
      />
    </>
  );
}

const DEFAULT_CHIPS: HeaderChip[] = [
  { shows: "watch", domain: "light" },
  { shows: "watch", domain: "lock" },
];

export default defineWidget<HeaderConfig>({
  manifest: {
    name: "Header",
    description:
      "Your dashboard's name, with chips for what is on, an entity to watch, or a scene to run",
    icon: "mdi:format-header-1",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 12, h: 1 },
    defaultSize: { w: 6, h: 1 },
    sdkVersion: "^1.14.1",
    capabilities: [
      { domain: "light", access: "control" },
      { domain: "lock", access: "control" },
      { domain: "cover", access: "control" },
      { domain: "switch", access: "control" },
      { domain: "fan", access: "control" },
      { domain: "scene", access: "control" },
      { domain: "script", access: "control" },
      { domain: "sensor", access: "read" },
    ],
    examples: [
      { label: "Dashboard header", size: { w: 6, h: 1 }, config: { where: { scope: "dashboard" }, chips: DEFAULT_CHIPS } },
      { label: "Section title", size: { w: 3, h: 1 }, config: { title: "Upstairs", icon: "mdi:stairs-up", where: { scope: "dashboard" }, chips: [] } },
    ],
  },
  configSchema,
  component: HeaderWidget,
});
