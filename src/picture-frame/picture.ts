import type { PictureFit } from "./types";

export type PictureView =
  | { kind: "empty"; title: string; message: string }
  | { kind: "picture"; src: string; objectFit: PictureFit };

export function resolvePicture(input: {
  src: string | undefined;
  fit: PictureFit | undefined;
  failed: boolean;
}): PictureView {
  if (!input.src)
    return { kind: "empty", title: "No picture yet", message: "Hold to pick one from your photos" };
  if (input.failed)
    return {
      kind: "empty",
      title: "That picture is gone",
      message: "Hold to pick another one",
    };
  return { kind: "picture", src: input.src, objectFit: input.fit ?? "cover" };
}
