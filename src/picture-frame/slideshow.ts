import type { ChangeInterval, PictureFit } from "./types";

export type Slide = { key: string; src: string };

export type SlideshowNote = { label: string; hint: string };

export type SlideshowView = {
  slides: Slide[];
  objectFit: PictureFit;
  autoplay?: number;
  note?: SlideshowNote;
};

const INTERVAL_MS: Record<ChangeInterval, number | undefined> = {
  off: undefined,
  "10s": 10_000,
  "30s": 30_000,
  "1m": 60_000,
  "5m": 300_000,
};

function samplesNote(chosen: number): SlideshowNote {
  if (chosen === 0) return { label: "Sample photos", hint: "Hold to add yours" };
  return {
    label: chosen === 1 ? "Your picture is gone" : "Your pictures are gone",
    hint: "Hold to pick others",
  };
}

export function resolveSlideshow(input: {
  pictures: ReadonlyArray<{ src: string | undefined }>;
  samples: readonly string[];
  fit: PictureFit | undefined;
  interval: ChangeInterval | undefined;
  failed: ReadonlySet<string>;
}): SlideshowView {
  const chosen = input.pictures.filter((p) => p.src !== undefined && p.src !== "");
  const own = chosen.flatMap<Slide>((p, index) =>
    p.src === undefined || input.failed.has(p.src)
      ? []
      : [{ key: `${index}:${p.src}`, src: p.src }],
  );
  const slides =
    own.length > 0 ? own : input.samples.map((src, index) => ({ key: `sample:${index}`, src }));

  const ms = INTERVAL_MS[input.interval ?? "30s"];
  return {
    slides,
    objectFit: input.fit ?? "cover",
    ...(slides.length > 1 && ms !== undefined ? { autoplay: ms } : {}),
    ...(own.length === 0 ? { note: samplesNote(chosen.length) } : {}),
  };
}
