import type { ImagePresetSource } from "@glasshome/widget-sdk";
import coast from "./assets/coast.webp";
import coastThumb from "./assets/coast-thumb.webp";
import dog from "./assets/dog.webp";
import dogThumb from "./assets/dog-thumb.webp";
import forest from "./assets/forest.webp";
import forestThumb from "./assets/forest-thumb.webp";
import meadow from "./assets/meadow.webp";
import meadowThumb from "./assets/meadow-thumb.webp";

/** Shown until the homeowner picks pictures, and offered in each picture's picker. */
export const SAMPLES: Record<string, ImagePresetSource> = {
  coast: { label: "Coast", src: coast, thumb: coastThumb },
  dog: { label: "Dog", src: dog, thumb: dogThumb },
  forest: { label: "Forest", src: forest, thumb: forestThumb },
  meadow: { label: "Meadow", src: meadow, thumb: meadowThumb },
};
