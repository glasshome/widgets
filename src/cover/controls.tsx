import type { EntityView } from "@glasshome/sync-layer";
import { useService } from "@glasshome/sync-layer/solid";
import { getEntityAttribute } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createSignal, Show } from "solid-js";

interface CoverControlsProps {
  entity: EntityView;
}

export function CoverControls(props: CoverControlsProps) {
  const { callService } = useService();
  const [positionValue, setPositionValue] = createSignal(
    getEntityAttribute<number>(props.entity, "current_position") ?? 0,
  );
  const [tiltValue, setTiltValue] = createSignal(
    getEntityAttribute<number>(props.entity, "current_tilt_position") ?? 0,
  );

  let positionTimer: ReturnType<typeof setTimeout> | undefined;
  let tiltTimer: ReturnType<typeof setTimeout> | undefined;

  const hasTilt = () =>
    getEntityAttribute<number>(props.entity, "current_tilt_position") !== undefined;

  const handleOpen = () =>
    callService("cover" as any, "open_cover" as any, {}, { entity_id: props.entity.id });
  const handleClose = () =>
    callService("cover" as any, "close_cover" as any, {}, { entity_id: props.entity.id });
  const handleStop = () =>
    callService("cover" as any, "stop_cover" as any, {}, { entity_id: props.entity.id });

  const handlePositionChange = (value: number) => {
    setPositionValue(value);
    clearTimeout(positionTimer);
    positionTimer = setTimeout(() => {
      callService(
        "cover" as any,
        "set_cover_position" as any,
        { position: value },
        { entity_id: props.entity.id },
      );
    }, 300);
  };

  const handleTiltChange = (value: number) => {
    setTiltValue(value);
    clearTimeout(tiltTimer);
    tiltTimer = setTimeout(() => {
      callService(
        "cover" as any,
        "set_cover_tilt_position" as any,
        { tilt_position: value },
        { entity_id: props.entity.id },
      );
    }, 300);
  };

  return (
    <div class="flex flex-col gap-5">
      <div class="flex items-center justify-center gap-3">
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
          onClick={handleOpen}
          title="Open"
        >
          <Icon icon="mdi:arrow-up" width={24} />
        </button>
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/80 active:bg-muted/60"
          onClick={handleStop}
          title="Stop"
        >
          <Icon icon="mdi:stop" width={24} />
        </button>
        <button
          type="button"
          class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary transition-colors hover:bg-primary/20 active:bg-primary/30"
          onClick={handleClose}
          title="Close"
        >
          <Icon icon="mdi:arrow-down" width={24} />
        </button>
      </div>

      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between">
          <label class="font-medium text-sm">Position</label>
          <span class="text-muted-foreground text-sm">{positionValue()}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={positionValue()}
          onInput={(e) => handlePositionChange(Number(e.currentTarget.value))}
          class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
        />
      </div>

      <Show when={hasTilt()}>
        <div class="flex flex-col gap-2">
          <div class="flex items-center justify-between">
            <label class="font-medium text-sm">Tilt</label>
            <span class="text-muted-foreground text-sm">{tiltValue()}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={tiltValue()}
            onInput={(e) => handleTiltChange(Number(e.currentTarget.value))}
            class="h-2 w-full cursor-pointer appearance-none rounded-lg bg-muted accent-primary"
          />
        </div>
      </Show>
    </div>
  );
}
