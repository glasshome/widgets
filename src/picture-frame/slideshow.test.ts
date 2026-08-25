import { describe, expect, test } from "bun:test";
import { resolveSlideshow } from "./slideshow";

const none: ReadonlySet<string> = new Set();

describe("resolveSlideshow", () => {
  test("invites pictures when none are chosen", () => {
    const view = resolveSlideshow({ pictures: [], fit: "cover", interval: "30s", failed: none });
    expect(view).toMatchObject({ kind: "empty", title: "No pictures yet" });
  });

  test("ignores items whose picture was never picked", () => {
    const view = resolveSlideshow({
      pictures: [{ src: undefined }],
      fit: "cover",
      interval: "30s",
      failed: none,
    });
    expect(view).toMatchObject({ kind: "empty", title: "No pictures yet" });
  });

  test("a single picture is a still frame: one slide, no autoplay", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      fit: "contain",
      interval: "10s",
      failed: none,
    });
    expect(view).toEqual({
      kind: "slideshow",
      slides: [{ key: "0:a", src: "a" }],
      objectFit: "contain",
    });
  });

  test("several pictures autoplay at the chosen interval", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }, { src: "c" }],
      fit: "cover",
      interval: "1m",
      failed: none,
    });
    expect(view).toMatchObject({ kind: "slideshow", autoplay: 60_000 });
    expect(view.kind === "slideshow" && view.slides).toHaveLength(3);
  });

  test("interval off leaves the slides without autoplay", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      fit: "cover",
      interval: "off",
      failed: none,
    });
    expect(view).toMatchObject({ kind: "slideshow" });
    expect(view).not.toHaveProperty("autoplay");
  });

  test("defaults to 30s when the interval is unset", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      fit: "cover",
      interval: undefined,
      failed: none,
    });
    expect(view).toMatchObject({ autoplay: 30_000 });
  });

  test("a picture that no longer resolves drops out, the rest keep playing", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "gone" }, { src: "c" }],
      fit: "cover",
      interval: "30s",
      failed: new Set(["gone"]),
    });
    expect(view.kind === "slideshow" && view.slides.map((s) => s.src)).toEqual(["a", "c"]);
  });

  test("two pictures left as one stop the autoplay", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "gone" }],
      fit: "cover",
      interval: "30s",
      failed: new Set(["gone"]),
    });
    expect(view).not.toHaveProperty("autoplay");
  });

  test("stays calm when every chosen picture is gone", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }, { src: "b" }],
      fit: "cover",
      interval: "30s",
      failed: new Set(["a", "b"]),
    });
    expect(view).toMatchObject({ kind: "empty", title: "Those pictures are gone" });
  });

  test("names the single gone picture in the singular", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      fit: "cover",
      interval: "30s",
      failed: new Set(["a"]),
    });
    expect(view).toMatchObject({ kind: "empty", title: "That picture is gone" });
  });

  test("falls back to cover when fit is unset", () => {
    const view = resolveSlideshow({
      pictures: [{ src: "a" }],
      fit: undefined,
      interval: "off",
      failed: none,
    });
    expect(view).toMatchObject({ objectFit: "cover" });
  });
});
