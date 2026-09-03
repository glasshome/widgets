import {
  Button,
  byDomain,
  defineWidget,
  SectionIcon,
  SectionTitle,
  useArea,
  useEntity,
  useService,
  useStore,
  useTemperatureUnit,
  useWidgetContext,
  useWidgetDashboard,
  useWidgetDialog,
  useWidgetDimensions,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { formatTemp, getWeatherIcon } from "../weather/utils";
import { Band } from "./band";
import { configSchema, type HeaderConfig, type HeaderItem } from "./config";
import { type SunTimes, sunWindow } from "./horizon";
import { type EntitySnapshot, resolveItem, visibleCount } from "./items";

const DEFAULT_SUN = "sun.sun";
const DEFAULT_WEATHER = "weather.home";

function HeaderWidget(props: { config: HeaderConfig }) {
  const ctx = useWidgetContext();
  const dashboard = useWidgetDashboard();
  const { callService } = useService();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();
  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    onCleanup(() => clearInterval(t));
  });

  const sun = useEntity(() => props.config.sunEntity[0] ?? DEFAULT_SUN);
  const times = createMemo<SunTimes>(() => {
    const s = sun();
    return sunWindow(
      s?.state,
      s?.attributes?.next_rising as string | undefined,
      s?.attributes?.next_setting as string | undefined,
      now(),
    );
  });

  const weather = useEntity(() => props.config.weatherEntity[0] ?? DEFAULT_WEATHER);
  const temperatureUnit = useTemperatureUnit();
  const temperature = createMemo(() => {
    const w = weather();
    const t = w?.attributes?.temperature;
    if (typeof t !== "number") return null;
    const unit = (w?.attributes?.temperature_unit as string | undefined) ?? temperatureUnit();
    return formatTemp(Math.round(t), unit.startsWith("°") ? unit : `°${unit}`);
  });

  const entities = useStore((s) => s.entities);
  const scopeArea = (item: HeaderItem) => {
    if (item.kind !== "status") return "";
    if (item.scope === "area") return item.areaId ?? "";
    if (item.scope === "dashboard") return dashboard().areaId ?? "";
    return "";
  };
  const dashboardArea = useArea(() => dashboard().areaId ?? "");

  const snapshot = (item: HeaderItem): EntitySnapshot[] => {
    const all = entities();
    const areaId = scopeArea(item);
    const ids =
      item.kind === "status"
        ? areaId
          ? (dashboardArea()?.entityIds ?? [])
          : (byDomain()[item.domain] ?? [])
        : item.kind === "entity" || item.kind === "action"
          ? item.entityId
          : [];
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

  const resolved = createMemo(() =>
    props.config.items.flatMap((item) => {
      // A status item scoped to an area needs the area's entities, which the
      // snapshot already narrows; an unset area means the whole home.
      if (item.kind === "status" && item.scope === "area" && !item.areaId) return [];
      const r = resolveItem(item as never, snapshot(item));
      return r ? [{ item, resolved: r }] : [];
    }),
  );

  async function run(service: { domain: string; name: string }, ids: string[]) {
    await callService(service.domain, service.name, {}, { entity_id: ids });
  }

  const Items = () => {
    const dimensions = useWidgetDimensions();
    const shown = createMemo(() => resolved().slice(0, visibleCount(dimensions().width, resolved().length)));
    return (
      <div class="flex min-w-0 shrink-0 items-center justify-end gap-2">
        <Show when={temperature() && dimensions().width > 520}>
          <span class="flex items-center gap-1 whitespace-nowrap text-[13px] text-foreground/85 tabular-nums">
            <Icon icon={getWeatherIcon(weather()?.state ?? "")} width={16} height={16} class="text-primary" />
            {temperature()}
          </span>
        </Show>
        <For each={shown()}>
          {(entry) => (
            <Show
              when={entry.resolved.kind !== "clock"}
              fallback={
                <span class="whitespace-nowrap font-mono font-semibold text-[15px] text-foreground tabular-nums">
                  {now().toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: entry.item.kind === "clock" && entry.item.timeFormat === "12",
                  })}
                </span>
              }
            >
              <Button
                variant="secondary"
                size="none"
                type="button"
                class="h-9 gap-1.5 whitespace-nowrap px-2.5"
                aria-label={entry.resolved.label}
                disabled={!entry.resolved.service}
                onClick={() => {
                  const s = entry.resolved.service;
                  if (s) void run(s, entry.resolved.ids);
                }}
              >
                <Icon
                  icon={entry.item.icon || entry.resolved.icon}
                  width={14}
                  height={14}
                  class={entry.resolved.tone}
                />
                <Show when={entry.resolved.value}>
                  <span class="font-semibold text-foreground tabular-nums">{entry.resolved.value}</span>
                </Show>
                <Show when={entry.resolved.word || entry.item.label}>
                  <span class="text-muted-foreground/70 text-xs">
                    {entry.item.label || entry.resolved.word}
                  </span>
                </Show>
              </Button>
            </Show>
          )}
        </For>
      </div>
    );
  };

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass">
        <div class="relative flex h-full min-w-0 items-center gap-3 overflow-hidden px-4">
          <Band now={now()} times={times()} />
          <SectionIcon size="sm">
            <Icon icon={props.config.icon || dashboard().icon || "mdi:view-dashboard"} />
          </SectionIcon>
          <SectionTitle class="min-w-0 flex-1 truncate">
            {props.config.title || dashboard().name || "Dashboard"}
          </SectionTitle>
          <Items />
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

const DEFAULT_ITEMS: HeaderItem[] = [
  { kind: "status", domain: "light", scope: "dashboard", label: "", icon: "" },
  { kind: "status", domain: "lock", scope: "dashboard", label: "", icon: "" },
  { kind: "clock", timeFormat: "24", label: "", icon: "" },
];

export default defineWidget<HeaderConfig>({
  manifest: {
    name: "Header",
    description:
      "Your dashboard's name over the daylight arc, with the items you choose: what is on, an entity, a quick action, the time",
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
      { domain: "weather", access: "read" },
      { domain: "sun", access: "read" },
    ],
    examples: [
      {
        label: "Dashboard header",
        size: { w: 6, h: 1 },
        config: { items: DEFAULT_ITEMS, sunEntity: [], weatherEntity: [] },
      },
      {
        label: "Section title",
        size: { w: 3, h: 1 },
        config: { title: "Upstairs", icon: "mdi:stairs-up", items: [], sunEntity: [], weatherEntity: [] },
      },
    ],
  },
  configSchema,
  component: HeaderWidget,
});
