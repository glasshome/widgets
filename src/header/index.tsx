import {
  Button,
  byDomain,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  SectionIcon,
  SectionTitle,
  useArea,
  useEntity,
  useService,
  useStore,
  useTemperatureUnit,
  useWidgetDashboard,
  useWidgetDimensions,
  Widget,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import { formatTemp, getWeatherIcon } from "../weather/utils";
import { greetingForHour, hourIn } from "./greeting";
import { activeIds, CHIPS, type ChipSpec, needsArea } from "./status";

const configSchema = defineConfig({
  title: field.text({ title: "Title", description: "Empty shows the dashboard's name" }),
  icon: field.icon({ title: "Icon" }),
  parts: field.choices(["clock", "weather", "status"], {
    title: "Show",
    default: ["clock", "weather", "status"],
    labels: { clock: "Clock", weather: "Weather", status: "Lights and locks" },
  }),
  timeFormat: field.choice(["24", "12"], { title: "Time format", default: "24" }),
  weatherEntity: field.entity("weather", { title: "Weather entity" }),
  scope: field.choice(["dashboard", "home", "area"], { title: "Status scope", default: "dashboard" }),
  areaId: field.area({ title: "Area" }),
});
type HeaderConfig = Infer<typeof configSchema>;

const MIN_WIDTH = { status: 300, clock: 460, weather: 620 } as const;
const DEFAULT_WEATHER = "weather.home";

function HeaderWidget(props: { config: HeaderConfig }) {
  const dashboard = useWidgetDashboard();
  const { callService } = useService();

  const [now, setNow] = createSignal(new Date());
  onMount(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    onCleanup(() => clearInterval(t));
  });
  const time = createMemo(() =>
    now().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: props.config.timeFormat === "12",
    }),
  );
  const dateShort = createMemo(() =>
    now().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
  );
  const greeting = createMemo(() => greetingForHour(hourIn(now())));

  const weatherId = () => props.config.weatherEntity[0] ?? DEFAULT_WEATHER;
  const weather = useEntity(weatherId);
  const temperatureUnit = useTemperatureUnit();
  const temp = createMemo(() => {
    const w = weather();
    const t = w?.attributes?.temperature;
    if (typeof t !== "number") return null;
    const unit = (w?.attributes?.temperature_unit as string | undefined) ?? temperatureUnit();
    return formatTemp(Math.round(t), unit.startsWith("°") ? unit : `°${unit}`);
  });

  const areaId = createMemo(() => {
    if (props.config.scope === "area") return props.config.areaId ?? "";
    if (props.config.scope === "dashboard") return dashboard().areaId ?? "";
    return "";
  });
  const area = useArea(areaId);
  const entities = useStore((s) => s.entities);
  const inScope = createMemo(() => {
    if (needsArea(props.config)) return [];
    const all = entities();
    const ids = areaId()
      ? (area()?.entityIds ?? [])
      : [...(byDomain().light ?? []), ...(byDomain().lock ?? [])];
    return ids.flatMap((id) => {
      const e = all[id];
      return e ? [{ id, state: e.state }] : [];
    });
  });
  const chips = createMemo(() =>
    (Object.values(CHIPS) as ChipSpec[])
      .map((chip) => ({ chip, ids: activeIds(chip, inScope()) }))
      .filter((c) => c.ids.length > 0),
  );
  async function act(chip: ChipSpec, ids: string[]) {
    await callService(chip.service.domain, chip.service.name, {}, { entity_id: ids });
  }

  const has = (part: HeaderConfig["parts"][number]) => props.config.parts.includes(part);

  const Parts = () => {
    const dimensions = useWidgetDimensions();
    const fits = (part: keyof typeof MIN_WIDTH) => {
      const w = dimensions().width;
      return w === 0 || w >= MIN_WIDTH[part];
    };
    return (
      <div class="flex min-w-0 items-center justify-end gap-3">
        <Show when={has("clock") && fits("clock")}>
          <div class="flex flex-col items-end gap-0.5 whitespace-nowrap">
            <span class="text-[11px] text-foreground/60">
              {greeting()} · {dateShort()}
            </span>
            <span class="font-mono font-semibold text-[13px] text-foreground/85 tabular-nums">{time()}</span>
          </div>
        </Show>
        <Show when={has("weather") && fits("weather") && temp()}>
          <span class="flex items-center gap-1 whitespace-nowrap text-[13px] text-foreground/85 tabular-nums">
            <Icon icon={getWeatherIcon(weather()?.state ?? "")} width={16} height={16} class="text-primary" />
            {temp()}
          </span>
        </Show>
        <Show when={has("status") && fits("status") && chips().length > 0}>
          <For each={chips()}>
            {(c) => (
              <Button
                variant="secondary"
                size="none"
                type="button"
                class="h-9 gap-1.5 px-2.5"
                aria-label={c.chip.actionLabel}
                onClick={() => void act(c.chip, c.ids)}
              >
                <Icon icon={c.chip.icon} width={14} height={14} class={c.chip.tone} />
                <span class="font-semibold text-foreground tabular-nums">{c.ids.length}</span>
                <span class="text-muted-foreground/70 text-xs">{c.chip.stateWord}</span>
              </Button>
            )}
          </For>
        </Show>
      </div>
    );
  };

  return (
    <Widget variant="classic-glass">
      <div class="flex h-full min-w-0 items-center gap-3 px-4">
        <SectionIcon size="sm">
          <Icon icon={props.config.icon || dashboard().icon || "mdi:view-dashboard"} />
        </SectionIcon>
        <SectionTitle class="min-w-0 flex-1 truncate">
          {props.config.title || dashboard().name || "Dashboard"}
        </SectionTitle>
        <Parts />
      </div>
    </Widget>
  );
}

export default defineWidget<HeaderConfig>({
  manifest: {
    name: "Header",
    description:
      "Your dashboard's name with the time, the weather and what is on, or a title for a section of the grid",
    icon: "mdi:format-header-1",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 12, h: 1 },
    defaultSize: { w: 6, h: 1 },
    sdkVersion: "^1.14.1",
    capabilities: [
      { domain: "light", access: "control" },
      { domain: "lock", access: "control" },
      { domain: "weather", access: "read" },
    ],
    examples: [
      {
        label: "Dashboard header",
        size: { w: 6, h: 1 },
        config: {
          parts: ["clock", "weather", "status"],
          timeFormat: "24",
          weatherEntity: [],
          scope: "dashboard",
        },
      },
      {
        label: "Section title",
        size: { w: 3, h: 1 },
        config: {
          title: "Upstairs",
          icon: "mdi:stairs-up",
          parts: [],
          timeFormat: "24",
          weatherEntity: [],
          scope: "dashboard",
        },
      },
    ],
  },
  configSchema,
  component: HeaderWidget,
});
