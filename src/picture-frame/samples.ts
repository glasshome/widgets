import type { ImagePresetSource } from "@glasshome/widget-sdk";
import { standIn } from "../common/art/stand-in";
import coastThumb from "./assets/coast-thumb.webp";
import dogThumb from "./assets/dog-thumb.webp";
import forestThumb from "./assets/forest-thumb.webp";
import meadowThumb from "./assets/meadow-thumb.webp";
import "./sample-art.css";

/** Shown until the homeowner picks pictures, and offered in each picture's picker. */
export const SAMPLES: Record<string, ImagePresetSource> = {
  // ui-text-ok: schema label the manifest derives
  coast: { label: "Coast", src: standIn("sample-coast"), thumb: coastThumb },
  // ui-text-ok: schema label the manifest derives
  dog: { label: "Dog", src: standIn("sample-dog"), thumb: dogThumb },
  // ui-text-ok: schema label the manifest derives
  forest: { label: "Forest", src: standIn("sample-forest"), thumb: forestThumb },
  // ui-text-ok: schema label the manifest derives
  meadow: { label: "Meadow", src: standIn("sample-meadow"), thumb: meadowThumb },
};
