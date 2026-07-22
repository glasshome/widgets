import { type EntityView, getEntityAttribute, useService } from "@glasshome/widget-sdk";
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

  const handleVolumeChange = (value: number) => {
    callService(
      "media_player",
      "volume_set",
      { volume_level: value / 100 },
      { entity_id: entityId() },
    );
  };

  const volumeLevel = createMemo(() => {
    const e = props.entity();
    const vol = e ? getEntityAttribute<number>(e, "volume_level") : undefined;
    return vol != null ? Math.round(vol * 100) : 50;
  });

  const sourceList = createMemo(() => {
    const e = props.entity();
    return e ? (getEntityAttribute<string[]>(e, "source_list") ?? []) : [];
  });
  const currentSource = createMemo(() => {
    const e = props.entity();
    return e ? (getEntityAttribute<string>(e, "source") ?? "") : "";
  });

  const handleSourceChange = (source: string) => {
    callService("media_player", "select_source", { source }, { entity_id: entityId() });
  };

  return (
    <div class="flex flex-col gap-4">
      {/* Playback controls */}
      <Show when={features()?.supportsPlayPause}>
        <div class="flex items-center justify-center gap-4">
          <Show when={features()?.supportsPrevious}>
            <button type="button" onClick={handlePrevious} class="rounded-full p-2 hover:bg-accent">
              <Icon icon="mdi:skip-previous" width={24} />
            </button>
          </Show>
          <button
            type="button"
            onClick={handlePlayPause}
            class="rounded-full bg-primary p-3 text-primary-foreground hover:bg-primary/90"
          >
            <Icon icon={isPlaying() ? "mdi:pause" : "mdi:play"} width={28} />
          </button>
          <Show when={features()?.supportsNext}>
            <button type="button" onClick={handleNext} class="rounded-full p-2 hover:bg-accent">
              <Icon icon="mdi:skip-next" width={24} />
            </button>
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
          <input
            type="range"
            min="0"
            max="100"
            value={volumeLevel()}
            onInput={(e) => handleVolumeChange(Number.parseInt(e.currentTarget.value, 10))}
            class="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary"
          />
          <span class="w-8 text-right text-muted-foreground text-xs tabular-nums">
            {volumeLevel()}
          </span>
        </div>
      </Show>

      {/* Source selector */}
      <Show when={features()?.supportsSource && sourceList().length > 0}>
        <div class="flex flex-col gap-1.5">
          <label for="media-player-source" class="font-medium text-sm">
            Source
          </label>
          <select
            id="media-player-source"
            value={currentSource()}
            onChange={(e) => handleSourceChange(e.currentTarget.value)}
            class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {sourceList().map((src: string) => (
              <option value={src}>{src}</option>
            ))}
          </select>
        </div>
      </Show>
    </div>
  );
}
