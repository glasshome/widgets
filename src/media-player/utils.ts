import type { EntityView } from "@glasshome/sync-layer";

// Home Assistant supported_features bitmask values for media_player
const FEATURE_PAUSE = 1;
const FEATURE_SEEK = 2;
const FEATURE_VOLUME_SET = 4;
const FEATURE_VOLUME_MUTE = 8;
const FEATURE_PREVIOUS_TRACK = 16;
const FEATURE_NEXT_TRACK = 32;
const FEATURE_TURN_ON = 128;
const FEATURE_TURN_OFF = 256;
const FEATURE_PLAY_MEDIA = 512;
const FEATURE_VOLUME_STEP = 1024;
const FEATURE_SELECT_SOURCE = 2048;
const FEATURE_PLAY = 16384;
const FEATURE_SELECT_SOUND_MODE = 65536;

export interface MediaFeatures {
  supportsPlayPause: boolean;
  supportsVolume: boolean;
  supportsNext: boolean;
  supportsPrevious: boolean;
  supportsSeek: boolean;
  supportsSource: boolean;
  supportsSoundMode: boolean;
}

export function calculateFeatures(entity: EntityView): MediaFeatures {
  const features = (entity.attributes?.supported_features as number) ?? 0;
  return {
    supportsPlayPause: !!(features & (FEATURE_PLAY | FEATURE_PAUSE)),
    supportsVolume: !!(features & (FEATURE_VOLUME_SET | FEATURE_VOLUME_STEP)),
    supportsNext: !!(features & FEATURE_NEXT_TRACK),
    supportsPrevious: !!(features & FEATURE_PREVIOUS_TRACK),
    supportsSeek: !!(features & FEATURE_SEEK),
    supportsSource: !!(features & FEATURE_SELECT_SOURCE),
    supportsSoundMode: !!(features & FEATURE_SELECT_SOUND_MODE),
  };
}

export function getMediaIcon(state: string): string {
  switch (state) {
    case "playing":
      return "mdi:play";
    case "paused":
      return "mdi:pause";
    case "buffering":
      return "mdi:loading";
    case "idle":
    case "off":
    case "standby":
      return "mdi:music-off";
    default:
      return "mdi:music";
  }
}

export function calculateProgress(entity: EntityView): number {
  const duration = entity.attributes?.media_duration as number | undefined;
  const position = entity.attributes?.media_position as number | undefined;
  const updatedAt = entity.attributes?.media_position_updated_at as string | undefined;

  if (duration == null || duration <= 0 || position == null) return 0;

  let currentPosition = position;
  if (updatedAt && entity.state === "playing") {
    const elapsed = (Date.now() - new Date(updatedAt).getTime()) / 1000;
    currentPosition = position + elapsed;
  }

  return Math.min(Math.max(currentPosition / duration, 0), 1);
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}
