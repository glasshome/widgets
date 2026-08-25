import { describe, expect, test } from "bun:test";
import { resolvePicture } from "./picture";

describe("resolvePicture", () => {
  test("invites a picture when none is chosen", () => {
    const view = resolvePicture({ src: undefined, fit: "cover", failed: false });
    expect(view.kind).toBe("empty");
    expect(view).toMatchObject({ title: "No picture yet" });
  });

  test("stays calm when the chosen picture no longer resolves", () => {
    const view = resolvePicture({ src: "blob:image", fit: "cover", failed: true });
    expect(view.kind).toBe("empty");
    expect(view).toMatchObject({ title: "That picture is gone" });
  });

  test("carries the fit through", () => {
    expect(resolvePicture({ src: "a", fit: "cover", failed: false })).toEqual({
      kind: "picture",
      src: "a",
      objectFit: "cover",
    });
    expect(resolvePicture({ src: "a", fit: "contain", failed: false })).toEqual({
      kind: "picture",
      src: "a",
      objectFit: "contain",
    });
  });

  test("falls back to cover when fit is unset", () => {
    expect(resolvePicture({ src: "a", fit: undefined, failed: false })).toMatchObject({
      objectFit: "cover",
    });
  });
});
