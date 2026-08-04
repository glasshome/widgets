import {
  Button,
  type EntityView,
  getEntityAttribute,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Slider,
  useService,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import type { Accessor } from "solid-js";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { calculateFeatures, calculateProgress, formatDuration } from "./utils";

interface MediaPlayerControlsProps {
  entity: Accessor<EntityView | undefined>;
}

export function MediaPlayerControls(props: MediaPlayerControlsProps) {
  const { callService } = useService();

  const features = createMemo(() => {
    const e = props.entity();
    if (!e) return null;
    return calculateFeatures(e);
  });

  const isPlaying = () => props.entity()?.state === "playing";

  // Progress tracking with 1-second updates
  const [progress, setProgress] = createSignal(0);
  const progressInterval = setInterval(() => {
    const e = props.entity();
    if (e) setProgress(calculateProgress(e));
  }, 1000);
  onCleanup(() => clearInterval(progressInterval));

  const duration = createMemo(() => {
    const e = props.entity();
    return e ? (getEntityAttribute<number>(e, "media_duration") ?? 0) : 0;
  });
  const currentPosition = createMemo(() => progress() * duration());

  const entityId = () => props.entity()?.id ?? "";

  const handlePlayPause = () => {
    callService("media_player", "media_play_pause", {}, { entity_id: entityId() });
  };

  const handleNext = () => {
    callService("media_player", "media_next_track", {}, { entity_id: entityId() });
  };

  const handlePrevious = () => {
    callService("media_player", "media_previous_track", {}, { entity_id: entityId() });
  };

  const volumeLevel = createMemo(() => {
    const e = props.entity();
    const vol = e ? getEntityAttribute<number>(e, "volume_level") : undefined;
    return vol != null ? Math.round(vol * 100) : 50;
  });

  // Local echo while dragging so the thumb doesn't fight the lagging entity.
  const [localVolume, setLocalVolume] = createSignal(volumeLevel());
  const [editingVolume, setEditingVolume] = createSignal(false);
  let volumeDebounce: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => {
    if (volumeDebounce) clearTimeout(volumeDebounce);
  });
  const shownVolume = () => (editingVolume() ? localVolume() : volumeLevel());

  const handleVolumeChange = (values: number[]) => {
    const value = values[0];
    setEditingVolume(true);
    setLocalVolume(value);
    if (volumeDebounce) clearTimeout(volumeDebounce);
    volumeDebounce = setTimeout(() => {
      setEditingVolume(false);
      callService(
        "media_player",
        "volume_set",
        { volume_level: value / 100 },
        { entity_id: entityId() },
      );
    }, 300);
  };

  const sourceList = createMemo(() => {
    const e = props.entity();
    return e ? (getEntityAttribute<string[]>(e, "source_list") ?? []) : [];
  });
  const currentSource = createMemo(() => {
    const e = props.entity();
    return e ? (getEntityAttribute<string>(e, "source") ?? "") : "";
  });

  const handleSourceChange = (source: string | null) => {
    if (!source) return;
    callService("media_player", "select_source", { source }, { entity_id: entityId() });
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Playback controls */}
      <Show when={features()?.supportsPlayPause}>
        <div class="flex items-center justify-center gap-4">
          <Show when={features()?.supportsPrevious}>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous track"
              onClick={handlePrevious}
            >
              <Icon icon="mdi:skip-previous" width={24} />
            </Button>
          </Show>
          <Button
            size="icon"
            class="size-14"
            aria-label={isPlaying() ? "Pause" : "Play"}
            onClick={handlePlayPause}
          >
            <Icon icon={isPlaying() ? "mdi:pause" : "mdi:play"} width={28} />
          </Button>
          <Show when={features()?.supportsNext}>
            <Button variant="ghost" size="icon" aria-label="Next track" onClick={handleNext}>
              <Icon icon="mdi:skip-next" width={24} />
            </Button>
          </Show>
        </div>
      </Show>

      {/* Progress bar */}
      <Show when={duration() > 0}>
        <div class="flex flex-col gap-1">
          <div class="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
              style={{ width: `${progress() * 100}%` }}
            />
          </div>
          <div class="flex justify-between text-muted-foreground text-xs tabular-nums">
            <span>{formatDuration(currentPosition())}</span>
            <span>{formatDuration(duration())}</span>
          </div>
        </div>
      </Show>

      {/* Volume */}
      <Show when={features()?.supportsVolume}>
        <div class="flex items-center gap-3">
          <Icon icon="mdi:volume-medium" width={18} class="text-muted-foreground" />
          <Slider
            value={[shownVolume()]}
            min={0}
            max={100}
            onChange={handleVolumeChange}
            aria-label="Volume"
            class="flex-1"
          />
          <span class="w-8 text-right text-muted-foreground text-xs tabular-nums">
            {Math.round(shownVolume())}
          </span>
        </div>
      </Show>

      {/* Source selector */}
      <Show when={features()?.supportsSource && sourceList().length > 0}>
        <div class="flex flex-col gap-1.5">
          <span class="font-medium text-sm">Source</span>
          <Select
            options={sourceList()}
            value={currentSource()}
            onChange={handleSourceChange}
            itemComponent={(itemProps) => (
              <SelectItem item={itemProps.item}>{itemProps.item.rawValue}</SelectItem>
            )}
          >
            <SelectTrigger class="w-full" aria-label="Source">
              <SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
            </SelectTrigger>
            <SelectContent style={{ "max-height": "min(50vh, 20rem)", "overflow-y": "auto" }} />
          </Select>
        </div>
      </Show>
    </div>
  );
}
