import {
  Button,
  byDomain,
  defineWidget,
  Icon,
  useArea,
  useService,
  useStore,
  useWidgetContext,
  useWidgetDashboard,
  useWidgetDialog,
  useWidgetDimensions,
  useWidgetViewer,
  Widget,
  WidgetDialog,
  WidgetIcon,
} from "@glasshome/widget-sdk";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { configSchema, type HeaderChip, type HeaderConfig } from "./config";
import { greetingForHour, hourIn } from "./greeting";
import { type EntitySnapshot, needsArea, resolveChip, visibleCount, WATCH_DOMAIN } from "./items";
import "./header.css";

function HeaderWidget(props: { config: HeaderConfig }) {
  const ctx = useWidgetContext();
  const dashboard = useWidgetDashboard();
  const viewer = useWidgetViewer();
  const { callService } = useService();
  const { setShowDialog, dialogProps } = useWidgetDialog();

  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    onCleanup(() => clearInterval(t));
  });
  const greeting = createMemo(() => {
    const hello = greetingForHour(hourIn(now()));
    const name = viewer().name;
    return name ? `${hello}, ${name}` : hello;
  });

  const areaId = createMemo(() => {
    const where = props.config.where;
    if (where.scope === "area") return where.areaId ?? "";
    if (where.scope === "dashboard") return dashboard().areaId ?? "";
    return "";
  });
  const area = useArea(areaId);
  const entities = useStore((s) => s.entities);

  // A chip that names its own entities means those, wherever they are; the
  // widget's Where only narrows a chip that counts a whole domain.
  const idsFor = (chip: HeaderChip): string[] => {
    const domain = WATCH_DOMAIN[chip.shows];
    if (!domain) return "entityId" in chip ? chip.entityId : [];
    const only = "only" in chip ? chip.only : [];
    if (only.length > 0) return only;
    return areaId() ? (area()?.entityIds ?? []) : (byDomain()[domain] ?? []);
  };

  const snapshot = (chip: HeaderChip): EntitySnapshot[] => {
    const all = entities();
    return idsFor(chip).flatMap((id) => {
      const e = all[id];
      if (!e) return [];
      return [
        {
          id,
          state: e.state,
          name: e.attributes?.friendly_name as string | undefined,
          unit: e.attributes?.unit_of_measurement as string | undefined,
          icon: e.attributes?.icon as string | undefined,
          deviceClass: e.attributes?.device_class as string | undefined,
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
    const shown = createMemo(() =>
      chips().slice(0, visibleCount(dimensions().width, chips().length)),
    );
    return (
      <div class="header-chips">
        <For each={shown()}>
          {(chip) => (
            <Button
              as={chip.service ? "button" : "span"}
              variant="outline"
              size="none"
              type={chip.service ? "button" : undefined}
              class={`header-chip ${chip.service ? "" : "cursor-default"}`}
              aria-label={chip.label}
              onClick={() => {
                if (chip.service)
                  void callService(
                    chip.service.domain,
                    chip.service.name,
                    {},
                    { entity_id: chip.ids },
                  );
              }}
            >
              <Icon icon={chip.icon} width={18} height={18} class={chip.tone} />
              <Show when={chip.value}>
                <span class="header-chip-value">{chip.value}</span>
              </Show>
            </Button>
          )}
        </For>
      </div>
    );
  };

  return (
    <>
      <Widget variant="classic-glass">
        <div class="header">
          <WidgetIcon
            icon={<Icon icon={props.config.icon || dashboard().icon || "mdi:view-dashboard"} />}
            class="header-icon"
          />
          <div class="header-text">
            <Show when={props.config.greeting}>
              <span class="header-greeting">{greeting()}</span>
            </Show>
            <span class="header-title">
              {props.config.title || dashboard().name || "Dashboard"}
            </span>
          </div>
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
  { shows: "lights", only: [] },
  { shows: "locks", only: [] },
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
    sdkVersion: "^1.15.0",
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
      {
        label: "Dashboard header",
        size: { w: 6, h: 1 },
        config: { greeting: true, where: { scope: "dashboard" }, chips: DEFAULT_CHIPS },
      },
      {
        label: "Section title",
        size: { w: 3, h: 1 },
        config: {
          title: "Upstairs",
          icon: "mdi:stairs-up",
          greeting: false,
          where: { scope: "dashboard" },
          chips: [],
        },
      },
    ],
  },
  configSchema,
  component: HeaderWidget,
});
