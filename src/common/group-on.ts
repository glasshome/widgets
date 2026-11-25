import type { TranslationTools } from "@glasshome/widget-sdk";
import { groupLine } from "./group";

/** Its own file: a widget's catalog must hold every key literal its imports name, so lock and cover must not import these. */
export function groupOnLine(
  tools: Pick<TranslationTools, "t">,
  active: number,
  total: number,
): string {
  return groupLine(tools, active, total, {
    all: "common.group.all-on",
    none: "common.group.all-off",
    some: "common.group.some-on",
  });
}
