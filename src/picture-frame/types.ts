import { defineConfig, field, type Infer } from "@glasshome/widget-sdk";

export const configSchema = defineConfig({
  image: field.image({ title: "Picture" }),
  caption: field.text({ title: "Caption" }),
  fit: field.choice(["cover", "contain"], { title: "Fit", default: "cover" }),
});

export type PictureFrameConfig = Infer<typeof configSchema>;
export type PictureFit = PictureFrameConfig["fit"];
