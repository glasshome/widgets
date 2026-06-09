import type { EntityView } from "@glasshome/sync-layer";
import { useService } from "@glasshome/sync-layer/solid";
import { Slider } from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import {
  getCoverCapabilities,
  getCoverPosition,
  getCoverStatusText,
  getCoverTiltPosition,
  isCoverMoving,
} from "./cover-entity";

interface CoverControlsProps {
  entity: EntityView;
  showName?: boolean;
}

// Keep the released slider value on screen until HA starts reporting the
// moving position, so the thumb doesn't snap back to the stale value.
const DRAG_RELEASE_GRACE_MS = 1000;

export function CoverControls(props: CoverControlsProps) {
  const { callService } = useService();

  const capabilities = createMemo(() => getCoverCapabilities(props.entity));
  const position = createMemo(() => getCoverPosition(props.entity));
  const tiltPosition = createMemo(() => getCoverTiltPosition(props.entity));

  const [dragPosition, setDragPosition] = createSignal<number | null>(null);
  const [dragTilt, setDragTilt] = createSignal<number | null>(null);

  const displayPosition = createMemo(() => dragPosition() ?? position() ?? 0);
  const displayTilt = createMemo(() => dragTilt() ?? tiltPosition() ?? 0);

  // assumed_state covers can't know their real position; keep buttons enabled.
  const assumed = () => props.entity.attributes.assumed_state === true;
  const moving = () => isCoverMoving(props.entity);
  const fullyOpen = createMemo(() => {
    const pos = position();
    return pos !== null ? pos >= 100 : props.entity.state === "open";
  });
  const fullyClosed = () => props.entity.state === "closed";

  const openDisabled = () => !assumed() && !moving() && fullyOpen();
  const closeDisabled = () => !assumed() && !moving() && fullyClosed();
  const stopDisabled = () => !assumed() && !moving();

  let positionGrace: ReturnType<typeof setTimeout> | undefined;
  let tiltGrace: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    clearTimeout(positionGrace);
    clearTimeout(tiltGrace);
  });

  const commitPosition = (value: number) => {
    callService("cover", "set_cover_position", { position: value }, { entity_id: props.entity.id });
    clearTimeout(positionGrace);
    positionGrace = setTimeout(() => setDragPosition(null), DRAG_RELEASE_GRACE_MS);
  };

  const commitTilt = (value: number) => {
    callService(
      "cover",
      "set_cover_tilt_position",
      { tilt_position: value },
      { entity_id: props.entity.id },
    );
    clearTimeout(tiltGrace);
    tiltGrace = setTimeout(() => setDragTilt(null), DRAG_RELEASE_GRACE_MS);
  };

  const target = () => ({ entity_id: props.entity.id });

  const showTiltButtons = createMemo(() => {
    const caps = capabilities();
    return !caps.canSetTiltPosition && (caps.canOpenTilt || caps.canCloseTilt);
  });

  return (
    <div class="flex flex-col gap-6">
      <Show when={props.showName}>
        <div class="flex items-center justify-between">
          <span class="font-medium text-sm">{props.entity.friendlyName}</span>
          <span class="text-muted-foreground text-sm">
            {getCoverStatusText(props.entity, position())}
          </span>
        </div>
      </Show>

      <div class="flex gap-2">
        <Show when={capabilities().canOpen}>
          <ActionButton
            icon="mdi:arrow-up"
            label="Open"
            primary
            disabled={openDisabled()}
            onClick={() => callService("cover", "open_cover", {}, target())}
          />
        </Show>
        <Show when={capabilities().canStop}>
          <ActionButton
            icon="mdi:stop"
            label="Stop"
            disabled={stopDisabled()}
            onClick={() => callService("cover", "stop_cover", {}, target())}
          />
        </Show>
        <Show when={capabilities().canClose}>
          <ActionButton
            icon="mdi:arrow-down"
            label="Close"
            primary
            disabled={closeDisabled()}
            onClick={() => callService("cover", "close_cover", {}, target())}
          />
        </Show>
      </div>

      <Show when={capabilities().canSetPosition}>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Position</span>
            <span class="text-muted-foreground text-sm">{displayPosition()}%</span>
          </div>
          <Slider
            value={[displayPosition()]}
            min={0}
            max={100}
            onChange={(values) => setDragPosition(values[0])}
            onChangeEnd={(values) => commitPosition(values[0])}
            aria-label="Position"
          />
        </div>
      </Show>

      <Show when={capabilities().canSetTiltPosition}>
        <div class="space-y-2.5">
          <div class="flex items-center justify-between">
            <span class="font-medium text-sm">Tilt</span>
            <span class="text-muted-foreground text-sm">{displayTilt()}%</span>
          </div>
          <Slider
            value={[displayTilt()]}
            min={0}
            max={100}
            onChange={(values) => setDragTilt(values[0])}
            onChangeEnd={(values) => commitTilt(values[0])}
            aria-label="Tilt"
          />
        </div>
      </Show>

      <Show when={showTiltButtons()}>
        <div class="space-y-2.5">
          <span class="font-medium text-sm">Tilt</span>
          <div class="flex gap-2">
            <Show when={capabilities().canOpenTilt}>
              <ActionButton
                icon="mdi:arrow-top-right"
                label="Open"
                primary
                onClick={() => callService("cover", "open_cover_tilt", {}, target())}
              />
            </Show>
            <Show when={capabilities().canStopTilt}>
              <ActionButton
                icon="mdi:stop"
                label="Stop"
                onClick={() => callService("cover", "stop_cover_tilt", {}, target())}
              />
            </Show>
            <Show when={capabilities().canCloseTilt}>
              <ActionButton
                icon="mdi:arrow-bottom-left"
                label="Close"
                primary
                onClick={() => callService("cover", "close_cover_tilt", {}, target())}
              />
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}

function ActionButton(props: {
  icon: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      class="flex h-14 flex-1 items-center justify-center gap-2.5 rounded-2xl font-medium text-base transition-colors active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100"
      classList={{
        "bg-primary/10 text-primary hover:bg-primary/20 disabled:hover:bg-primary/10":
          props.primary === true,
        "bg-muted text-muted-foreground hover:bg-muted/80 disabled:hover:bg-muted":
          props.primary !== true,
      }}
      disabled={props.disabled}
      onClick={() => props.onClick()}
    >
      <Icon icon={props.icon} width={22} />
      {props.label}
    </button>
  );
}
