import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  title: field.text({ title: "Title", description: "Empty shows the dashboard's name" }),
  icon: field.icon({ title: "Icon" }),
  scope: field.choice(["dashboard", "home", "area"], { title: "Where", default: "dashboard" }),
  areaId: field.area({ title: "Area" }),
  chips: field.list(
    field.variants(
      "shows",
      {
        watch: {
          domain: field.choice(["light", "lock", "cover", "switch", "fan"], {
            title: "What",
            default: "light",
          }),
        },
        entity: { entityId: field.entity("sensor", { title: "Entity" }) },
        action: { entityId: field.entity("scene", { title: "Scene or script" }) },
      },
      {
        title: "Shows",
        labels: { watch: "What is on", entity: "An entity", action: "Runs something" },
      },
    ),
    { title: "Chips", description: "Right to left; the last ones drop on a narrow screen", max: 6 },
  ),
});

export type HeaderConfig = Infer<typeof configSchema>;
export type HeaderChip = HeaderConfig["chips"][number];
