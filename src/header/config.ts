import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  title: field.text({ title: "Title", description: "Empty shows the dashboard's name" }),
  icon: field.icon({ title: "Icon", description: "Empty shows the dashboard's icon" }),
  where: field.variants(
    "scope",
    {
      dashboard: {},
      home: {},
      area: { areaId: field.area({ title: "Which area" }) },
    },
    {
      title: "Where the chips look",
      description: "Which entities a chip counts",
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
        watch: {
          domain: field.choice(["light", "lock", "cover", "switch", "fan"], {
            title: "What to count",
            default: "light",
            labels: {
              light: "Lights that are on",
              lock: "Doors unlocked",
              cover: "Covers open",
              switch: "Switches on",
              fan: "Fans running",
            },
          }),
        },
        entity: { entityId: field.entity("sensor", { title: "Which entity" }) },
        action: { entityId: field.entity("scene", { title: "What to run" }) },
      },
      {
        title: "Shows",
        labels: {
          watch: "How many are on, tap to turn them off",
          entity: "One entity's value",
          action: "A scene or script to run",
        },
      },
    ),
    {
      title: "Chips",
      description: "Right to left. A chip with nothing to report stays hidden, and the last ones drop on a narrow screen.",
      max: 6,
    },
  ),
});

export type HeaderConfig = Infer<typeof configSchema>;
export type HeaderChip = HeaderConfig["chips"][number];
