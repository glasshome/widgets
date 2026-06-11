import { type JSX, Show } from "solid-js";
import type { Rect } from "./types";

interface FlowNodeProps {
  rect: Rect;
  /** When set, the node is a button; tap fires this. Absent = static box. */
  onTap?: () => void;
  children: JSX.Element;
}

/**
 * Positions a node box from a layout rect. Pure placement — content (and its
 * clamp/truncate sizing) is the caller's. Painted after the SVG edge layer, so
 * an opaque node covers the ribbon ends that tuck under it.
 */
export function FlowNode(props: FlowNodeProps): JSX.Element {
  const style = (): JSX.CSSProperties => ({
    position: "absolute",
    left: `${props.rect.x}px`,
    top: `${props.rect.y}px`,
    width: `${props.rect.w}px`,
    height: `${props.rect.h}px`,
  });

  return (
    <Show when={props.onTap} fallback={<div style={style()}>{props.children}</div>}>
      <button
        type="button"
        class="block text-left"
        style={style()}
        // Stop pointerdown so grid edit-mode drag doesn't start on a node tap.
        on:pointerdown={(e: PointerEvent) => e.stopPropagation()}
        on:click={() => props.onTap?.()}
      >
        {props.children}
      </button>
    </Show>
  );
}
