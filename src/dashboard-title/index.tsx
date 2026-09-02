import {
  defineConfig,
  defineWidget,
  SectionIcon,
  SectionTitle,
  useWidgetDashboard,
  Widget,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { Show } from "solid-js";

const configSchema = defineConfig({});

function DashboardTitleWidget() {
  const dashboard = useWidgetDashboard();
  return (
    <Widget variant="classic-glass">
      <div class="flex h-full min-w-0 items-center gap-3 px-4">
        <SectionIcon size="md">
          <Icon icon={dashboard().icon || "mdi:view-dashboard"} />
        </SectionIcon>
        <Show when={dashboard().name} fallback={<SectionTitle class="truncate">Dashboard</SectionTitle>}>
          <SectionTitle class="truncate">{dashboard().name}</SectionTitle>
        </Show>
      </div>
    </Widget>
  );
}

export default defineWidget({
  manifest: {
    name: "Dashboard Title",
    description: "Your dashboard's name and icon",
    icon: "mdi:format-title",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 6, h: 1 },
    defaultSize: { w: 3, h: 1 },
    sdkVersion: "^1.14.1",
    capabilities: [],
    examples: [{ label: "Title", size: { w: 3, h: 1 }, config: {} }],
  },
  configSchema,
  component: DashboardTitleWidget,
});
