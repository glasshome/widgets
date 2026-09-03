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
        watch: {
          domain: field.choice(["light", "lock", "cover", "switch", "fan"], {
            title: "What to count",
            description: "Counts the ones that are on or open, and taps to put them back",
            default: "light",
            labels: {
              light: "Lights",
              lock: "Locks",
              cover: "Covers",
              switch: "Switches",
              fan: "Fans",
            },
          }),
        },
        entity: { entityId: field.entity("sensor", { title: "Which entity" }) },
        action: { entityId: field.entity("scene", { title: "What to run" }) },
      },
      {
        title: "Shows",
        description:
          "Counts what is on and taps to turn it off, shows one entity's value, or runs a scene",
        labels: { watch: "What is on", entity: "Entity", action: "Action" },
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
