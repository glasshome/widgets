import type { EntityView } from "@glasshome/widget-sdk";

// HA CoverEntityFeature bitmask values.
const FEATURE_OPEN = 1;
const FEATURE_CLOSE = 2;
const FEATURE_SET_POSITION = 4;
const FEATURE_STOP = 8;
const FEATURE_OPEN_TILT = 16;
const FEATURE_CLOSE_TILT = 32;
const FEATURE_STOP_TILT = 64;
const FEATURE_SET_TILT_POSITION = 128;

export interface CoverCapabilities {
  canOpen: boolean;
  canClose: boolean;
  canStop: boolean;
  canSetPosition: boolean;
  canOpenTilt: boolean;
  canCloseTilt: boolean;
  canStopTilt: boolean;
  canSetTiltPosition: boolean;
}

export function getCoverCapabilities(entity: EntityView | undefined): CoverCapabilities {
  const raw = entity?.supportedFeatures;
  // Covers that report no features can at least open and close.
  const features = typeof raw === "number" && raw > 0 ? raw : FEATURE_OPEN | FEATURE_CLOSE;
  return {
    canOpen: (features & FEATURE_OPEN) !== 0,
    canClose: (features & FEATURE_CLOSE) !== 0,
    canStop: (features & FEATURE_STOP) !== 0,
    canSetPosition: (features & FEATURE_SET_POSITION) !== 0,
    canOpenTilt: (features & FEATURE_OPEN_TILT) !== 0,
    canCloseTilt: (features & FEATURE_CLOSE_TILT) !== 0,
    canStopTilt: (features & FEATURE_STOP_TILT) !== 0,
    canSetTiltPosition: (features & FEATURE_SET_TILT_POSITION) !== 0,
  };
}

export function getCoverPosition(entity: EntityView | undefined): number | null {
  const position = entity?.attributes.current_position;
  return typeof position === "number" ? position : null;
}

export function getCoverTiltPosition(entity: EntityView | undefined): number | null {
  const position = entity?.attributes.current_tilt_position;
  return typeof position === "number" ? position : null;
}

// State-based, not position-based: position-less covers (garage doors,
// gates) only report open/closed.
export function isCoverOpen(entity: EntityView): boolean {
  return entity.state !== "closed" && entity.state !== "unavailable" && entity.state !== "unknown";
}
