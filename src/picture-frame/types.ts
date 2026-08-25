import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  pictures: field.list(
    field.group(
      {
        image: field.image({ title: "Picture" }),
        caption: field.text({ title: "Caption" }),
      },
      { title: "Picture" },
    ),
    { title: "Pictures", max: 24, labelField: "caption", addLabel: "Add picture" },
  ),
  fit: field.choice(["cover", "contain"], { title: "Fit", default: "cover" }),
  interval: field.choice(["off", "10s", "30s", "1m", "5m"], {
    title: "Change every",
    description: "Off keeps one picture up until you swipe to the next.",
    default: "30s",
  }),
});

export type PictureFrameConfig = Infer<typeof configSchema>;
export type PictureFit = PictureFrameConfig["fit"];
export type ChangeInterval = PictureFrameConfig["interval"];
