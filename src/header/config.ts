import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  title: field.text({ title: "Title", description: "Empty shows the dashboard's name" }),
  icon: field.icon({ title: "Icon" }),
  items: field.list(
    field.variants(
      "kind",
      {
        status: {
          domain: field.choice(["light", "lock", "cover", "switch", "fan"], {
            title: "What to watch",
            default: "light",
          }),
          scope: field.choice(["dashboard", "home", "area"], {
            title: "Where",
            default: "dashboard",
          }),
          areaId: field.area({ title: "Area" }),
        },
        entity: { entityId: field.entity("sensor", { title: "Entity" }) },
        action: {
          entityId: field.entity("scene", { title: "Scene, script or button" }),
        },
        clock: {
          timeFormat: field.choice(["24", "12"], { title: "Time format", default: "24" }),
        },
      },
      {
        title: "Kind",
        labels: {
          status: "What is on",
          entity: "An entity",
          action: "Quick action",
          clock: "Time",
        },
        shared: {
          label: field.text({ title: "Label" }),
          icon: field.icon({ title: "Icon" }),
        },
      },
    ),
    { title: "Items", description: "Shown right to left; the last ones drop on a narrow screen", max: 6, labelField: "label" },
  ),
  sunEntity: field.entity("sun", { title: "Sun entity" }),
  weatherEntity: field.entity("weather", { title: "Weather entity" }),
});

export type HeaderConfig = Infer<typeof configSchema>;
export type HeaderItem = HeaderConfig["items"][number];
