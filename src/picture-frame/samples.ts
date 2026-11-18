import type { ImagePresetSource } from "@glasshome/widget-sdk";
import { standIn } from "../common/art/stand-in";
import coastThumb from "./assets/coast-thumb.webp";
import dogThumb from "./assets/dog-thumb.webp";
import forestThumb from "./assets/forest-thumb.webp";
import meadowThumb from "./assets/meadow-thumb.webp";
import "./sample-art.css";

/** Shown until the homeowner picks pictures, and offered in each picture's picker. */
export const SAMPLES: Record<string, ImagePresetSource> = {
  coast: { label: "Coast", src: standIn("sample-coast"), thumb: coastThumb },
  dog: { label: "Dog", src: standIn("sample-dog"), thumb: dogThumb },
  forest: { label: "Forest", src: standIn("sample-forest"), thumb: forestThumb },
  meadow: { label: "Meadow", src: standIn("sample-meadow"), thumb: meadowThumb },
};
