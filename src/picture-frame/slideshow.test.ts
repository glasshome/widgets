import { describe, expect, test } from "bun:test";
import { resolveSlideshow } from "./slideshow";

const none: ReadonlySet<string> = new Set();
const samples = ["s1", "s2"];

describe("resolveSlideshow", () => {
  test("shows the samples, labelled, when none are chosen", () => {
    const view = resolveSlideshow({
      pictures: [],
      samples,
      fit: "cover",
      interval: "30s",
      failed: none,
    });
    expect(view.slides.map((s) => s.src)).toEqual(samples);
    expect(view).toMatchObject({ autoplay: 30_000, note: { label: "Sample photos" } });
  });

  test("ignores items whose picture was never picked", () => {
    const view = resolveSlideshow({
      pictures: [{ src: undefined }],
      samples,
      fit: "cover",
      interval: "30s",
      failed: none,
    });
    expect(view).toMatchObject({ note: { label: "Sample photos" } });
  });

  test("a single picture is a still frame: one slide, no autoplay, no note", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      samples,
      fit: "contain",
      interval: "10s",
      failed: none,
    });
    expect(view).toEqual({ slides: [{ key: "0:a", src: "a" }], objectFit: "contain" });
  });

  test("several pictures autoplay at the chosen interval", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }, { src: "c" }],
      samples,
      fit: "cover",
      interval: "1m",
      failed: none,
    });
    expect(view).toMatchObject({ autoplay: 60_000 });
    expect(view.slides).toHaveLength(3);
  });

  test("interval off leaves the slides without autoplay", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      samples,
      fit: "cover",
      interval: "off",
      failed: none,
    });
    expect(view).not.toHaveProperty("autoplay");
  });

  test("defaults to 30s when the interval is unset", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      samples,
      fit: "cover",
      interval: undefined,
      failed: none,
    });
    expect(view).toMatchObject({ autoplay: 30_000 });
  });

  test("a picture that no longer resolves drops out, the rest keep playing", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "gone" }, { src: "c" }],
      samples,
      fit: "cover",
      interval: "30s",
      failed: new Set(["gone"]),
    });
    expect(view.slides.map((s) => s.src)).toEqual(["a", "c"]);
  });

  test("two pictures left as one stop the autoplay", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "gone" }],
      samples,
      fit: "cover",
      interval: "30s",
      failed: new Set(["gone"]),
    });
    expect(view).not.toHaveProperty("autoplay");
  });

  test("falls back to the samples and says so when every chosen picture is gone", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      samples,
      fit: "cover",
      interval: "30s",
      failed: new Set(["a", "b"]),
    });
    expect(view.slides.map((s) => s.src)).toEqual(samples);
    expect(view).toMatchObject({ note: { label: "Your pictures are gone" } });
  });

  test("names the single gone picture in the singular", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      samples,
      fit: "cover",
      interval: "30s",
      failed: new Set(["a"]),
    });
    expect(view).toMatchObject({ note: { label: "Your picture is gone" } });
  });

  test("falls back to cover when fit is unset", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      samples,
      fit: undefined,
      interval: "off",
      failed: none,
    });
    expect(view).toMatchObject({ objectFit: "cover" });
  });
});
