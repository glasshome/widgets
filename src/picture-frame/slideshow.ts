import type { ChangeInterval, PictureFit } from "./types";

export type Slide = { key: string; src: string };

export type SlideshowView =
  | { kind: "empty"; title: string; message: string }
  | { kind: "slideshow"; slides: Slide[]; objectFit: PictureFit; autoplay?: number };

const INTERVAL_MS: Record<ChangeInterval, number | undefined> = {
  off: undefined,
  "10s": 10_000,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 300_000,
};

export function resolveSlideshow(input: {
  pictures: ReadonlyArray<{ src: string | undefined }>;
  fit: PictureFit | undefined;
  interval: ChangeInterval | undefined;
  failed: ReadonlySet<string>;
}): SlideshowView {
  const chosen = input.pictures.filter((p) => p.src !== undefined && p.src !== "");
  const slides = chosen.flatMap<Slide>((p, index) =>
    p.src === undefined || input.failed.has(p.src)
      ? []
      : [{ key: `${index}:${p.src}`, src: p.src }],
  );

  if (slides.length === 0) {
    if (chosen.length === 0) {
      return {
        kind: "empty",
        title: "No pictures yet",
        message: "Hold to pick some from your photos",
      };
    }
    return {
      kind: "empty",
      title: chosen.length === 1 ? "That picture is gone" : "Those pictures are gone",
      message: "Hold to pick others",
    };
  }

  const ms = INTERVAL_MS[input.interval ?? "30s"];
  const objectFit = input.fit ?? "cover";
  return slides.length > 1 && ms !== undefined
    ? { kind: "slideshow", slides, objectFit, autoplay: ms }
    : { kind: "slideshow", slides, objectFit };
}
