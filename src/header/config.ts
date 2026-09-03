import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  title: field.text({ title: "Title", description: "Empty shows the dashboard's name" }),
  icon: field.icon({ title: "Icon", description: "Empty shows the dashboard's icon" }),
  greeting: field.toggle({
    title: "Greeting",
    description: "A line under the name that follows the time of day",
    default: true,
  }),
  where: field.variants(
    "scope",
    {
      dashboard: {},
      home: {},
      area: { areaId: field.area({ title: "Which area" }) },
    },
    {
      title: "Where",
      description: "Which entities the chips count",
      labels: {
        dashboard: "This dashboard's area",
        home: "The whole home",
        area: "Somewhere specific",
      },
    },
  ),
  chips: field.list(
    field.variants(
      "shows",
      {
        lights: { only: field.entities("light", { title: "Only these" }) },
        locks: { only: field.entities("lock", { title: "Only these" }) },
        covers: { only: field.entities("cover", { title: "Only these" }) },
        switches: { only: field.entities("switch", { title: "Only these" }) },
        fans: { only: field.entities("fan", { title: "Only these" }) },
        value: { entityId: field.entity("sensor", { title: "Which entity" }) },
        action: { entityId: field.entity("scene", { title: "What to run" }) },
      },
      {
        title: "Kind",
        labels: { lights: "Lights", locks: "Locks", covers: "Covers", switches: "Switches", fans: "Fans", value: "Value", action: "Action" },
      },
    ),
    {
      title: "Chips",
      description: "Right to left. A chip with nothing to report hides itself.",
      max: 6,
    },
  ),
});

export type HeaderConfig = Infer<typeof configSchema>;
export type HeaderChip = HeaderConfig["chips"][number];
