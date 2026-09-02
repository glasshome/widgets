import {
  Button,
  byDomain,
  CountPill,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useArea,
  useService,
  useStore,
  useWidgetDashboard,
  Widget,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, Show } from "solid-js";
import { activeIds, CHIPS, needsArea, type ChipSpec } from "./status";

const configSchema = defineConfig({
  scope: field.choice(["dashboard", "home", "area"], { title: "Scope", default: "dashboard" }),
  areaId: field.area({ title: "Area" }),
  chips: field.choices(["lights", "locks"], {
    title: "Show",
    default: ["lights", "locks"],
    labels: { lights: "Lights", locks: "Locks" },
  }),
});
type HomeStatusConfig = Infer<typeof configSchema>;

function HomeStatusWidget(props: { config: HomeStatusConfig }) {
  const dashboard = useWidgetDashboard();
  const { callService } = useService();

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
    const view = area();
    const ids = areaId()
      ? (view?.entityIds ?? [])
      : [...(byDomain().light ?? []), ...(byDomain().lock ?? [])];
    return ids.flatMap((id) => {
      const e = all[id];
      return e ? [{ id, state: e.state }] : [];
    });
  });

  const chips = createMemo(() =>
    (Object.values(CHIPS) as ChipSpec[])
      .filter((chip) => props.config.chips.includes(chip.key))
      .map((chip) => ({ chip, ids: activeIds(chip, inScope()) }))
      .filter((c) => c.ids.length > 0),
  );

  async function act(chip: ChipSpec, ids: string[]) {
    await callService(chip.service.domain, chip.service.name, {}, { entity_id: ids });
  }

  return (
    <Widget variant="classic-glass">
      <div class="flex h-full items-center gap-2 px-3">
        <Show
          when={!needsArea(props.config)}
          fallback={<span class="text-muted-foreground text-sm">Pick an area</span>}
        >
          <Show when={chips().length > 0} fallback={<span class="text-muted-foreground text-sm">All quiet</span>}>
            <For each={chips()}>
              {(c) => (
                <Button
                  variant="secondary"
                  size="none"
                  type="button"
                  class="h-10 gap-1.5 px-3"
                  aria-label={c.chip.actionLabel}
                  onClick={() => void act(c.chip, c.ids)}
                >
                  <Icon icon={c.chip.icon} width={14} height={14} />
                  <CountPill>{c.ids.length}</CountPill>
                </Button>
              )}
            </For>
          </Show>
        </Show>
      </div>
    </Widget>
  );
}

export default defineWidget<HomeStatusConfig>({
  manifest: {
    name: "Home Status",
    description: "Lights on and doors unlocked, with one tap to fix each",
    icon: "mdi:home-alert-outline",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 6, h: 2 },
    defaultSize: { w: 4, h: 1 },
    sdkVersion: "^1.14.1",
    capabilities: [
      { domain: "light", access: "control" },
      { domain: "lock", access: "control" },
    ],
    examples: [
      { label: "Whole home", size: { w: 4, h: 1 }, config: { scope: "home", chips: ["lights", "locks"] } },
    ],
  },
  configSchema,
  component: HomeStatusWidget,
});
