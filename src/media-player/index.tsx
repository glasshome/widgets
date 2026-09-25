import {
  Button,
  ButtonGroup,
  buildDebugData,
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  hassMediaUrl,
  type Infer,
  useEntity,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  type WidgetDebugData,
  WidgetDialog,
  WidgetSliderFill,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import {
  Tile,
  TileBackdrop,
  TileControls,
  TileGlyph,
  TileHead,
  TileHero,
} from "../common/tile/tile";
import "./media.css";
import { MediaPlayerSheet, mediaHasExtras } from "./sheet";
import { calculateFeatures, getMediaIcon } from "./utils";
import { VinylRecord } from "./vinyl-record";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entity("media_player"),
});
type MediaPlayerConfig = Infer<typeof configSchema>;

function MediaPlayerWidget(props: { config: MediaPlayerConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const { callService } = useService();

  const isPlaying = () => entity()?.state === "playing";
  const features = createMemo(() => {
    const e = entity();
    return e ? calculateFeatures(e) : undefined;
  });

  const mediaTitle = createMemo(() => {
    const e = entity();
    return e ? (getEntityAttribute<string>(e, "media_title") ?? "") : "";
  });
  const mediaArtist = createMemo(() => {
    const e = entity();
    return e ? (getEntityAttribute<string>(e, "media_artist") ?? "") : "";
  });
  const albumArt = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    return hassMediaUrl(getEntityAttribute<string>(e, "entity_picture"));
  });

  const serverVolume = createMemo(() => {
    const e = entity();
    const v = e ? getEntityAttribute<number>(e, "volume_level") : undefined;
    return v === undefined ? 0 : Math.round(v * 100);
  });
  const [uiVolume, setUiVolume] = createSignal(serverVolume());
  const [isDragging, setIsDragging] = createSignal(false);
  createEffect(() => {
    const v = serverVolume();
    if (!isDragging()) setUiVolume(v);
  });

  const call = (service: string, data: Record<string, unknown> = {}) => {
    const id = entityId();
    if (id) callService("media_player", service, data, { entity_id: id });
  };

  let volumeDebounce: ReturnType<typeof setTimeout> | undefined;
  const onVolumeSlide = (value: number) => {
    setIsDragging(true);
    setUiVolume(value);
    if (volumeDebounce) clearTimeout(volumeDebounce);
    volumeDebounce = setTimeout(() => {
      setIsDragging(false);
      call("volume_set", { volume_level: value / 100 });
    }, 300);
  };

  const extras = createMemo(() => {
    const e = entity();
    return !!e && mediaHasExtras(e);
  });

  const gestures = useWidgetGestures(() => ({
    tap: () => call("media_play_pause"),
    hold: extras() ? { action: openDialog } : undefined,
    slide: features()?.supportsVolume
      ? {
          value: uiVolume(),
          onChange: onVolumeSlide,
          min: 0,
          max: 100,
          orientation: "auto" as const,
          activationDelay: 0,
        }
      : undefined,
  }));
  onCleanup(gestures.dispose);

  const eyebrow = () => {
    const state = entity()?.state ?? "";
    const label = state === "playing" ? undefined : state.charAt(0).toUpperCase() + state.slice(1);
    return [mediaArtist() || undefined, label].filter(Boolean).join(" · ") || undefined;
  };

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e]);
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        emptyState={
          !entity()
            ? {
                icon: <Icon icon="mdi:music" width={32} />,
                title: "No media player",
                message: "Hold to configure",
              }
            : undefined
        }
      >
        <Show when={entity()}>
          {(e) => (
            <>
              <Tile class="media-tile" backdrop={!!albumArt()} active={isPlaying()}>
                <Show when={albumArt()}>
                  {(src) => (
                    <TileBackdrop>
                      <img src={src()} alt="" class="media-backdrop" />
                    </TileBackdrop>
                  )}
                </Show>
                <Show when={features()?.supportsVolume}>
                  <div class="media-fill">
                    <WidgetSliderFill value={uiVolume()} isDragging={isDragging()} />
                  </div>
                </Show>
                <TileGlyph icon={getMediaIcon(e().state)} />
                <TileHead
                  icon="mdi:music"
                  eyebrow={eyebrow()}
                  name={mediaTitle() || props.config.title || e().friendlyName || "Media"}
                  active={isPlaying()}
                />
                <TileHero
                  value=""
                  art={<VinylRecord imageUrl={albumArt()} isPlaying={isPlaying()} />}
                />
                <TileControls>
                  <ButtonGroup aria-label="Playback" class="tile-stepper">
                    <Show when={features()?.supportsPrevious}>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Previous track"
                        class="tile-control"
                        onClick={() => call("media_previous_track")}
                      >
                        <Icon icon="mdi:skip-previous" width={20} />
                      </Button>
                    </Show>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label={isPlaying() ? "Pause" : "Play"}
                      class="tile-control"
                      onClick={() => call("media_play_pause")}
                    >
                      <Icon icon={isPlaying() ? "mdi:pause" : "mdi:play"} width={20} />
                    </Button>
                    <Show when={features()?.supportsNext}>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Next track"
                        class="tile-control"
                        onClick={() => call("media_next_track")}
                      >
                        <Icon icon="mdi:skip-next" width={20} />
                      </Button>
                    </Show>
                  </ButtonGroup>
                  <Show when={features()?.supportsVolume}>
                    <span class="media-volume">
                      <Icon icon="mdi:volume-high" width={16} />
                      {uiVolume()}%
                    </span>
                  </Show>
                </TileControls>
              </Tile>
            </>
          )}
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Media Player"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(extras()
          ? {
              sheet: (
                <Show when={entity()}>
                  {(e) => (
                    <MediaPlayerSheet
                      entity={e()}
                      name={props.config.title || e().friendlyName || "Media"}
                    />
                  )}
                </Show>
              ),
            }
          : {})}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<MediaPlayerConfig>({
  manifest: {
    name: "Media Player",
    description: "Media playback controls with album art and progress tracking",
    icon: "mdi:music",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 8, h: 8 },
    defaultSize: { w: 3, h: 3 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Playing",
        size: {
          w: 3,
          h: 3,
        },
        config: {
          entityIds: ["media_player.living_room_speaker"],
          title: "Living Room",
        },
      },
      {
        label: "Wide",
        size: {
          w: 4,
          h: 2,
        },
        config: {
          entityIds: ["media_player.living_room_speaker"],
          title: "Living Room",
        },
      },
      {
        label: "Large",
        size: {
          w: 4,
          h: 4,
        },
        config: {
          entityIds: ["media_player.living_room_speaker"],
          title: "Living Room",
        },
      },
    ],
  },
  configSchema,
  component: MediaPlayerWidget,
});
