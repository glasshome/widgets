import {
  defineWidget,
  getEntityAttribute,
  useEntity,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { MediaPlayerControls } from "./controls";
import { getMediaIcon } from "./utils";
import { VinylRecord } from "./vinyl-record";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.singleEntity("media_player"),
});
type MediaPlayerConfig = z.infer<typeof configSchema>;

function MediaPlayerWidget(props: { config: MediaPlayerConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const { callService } = useService();

  const isPlaying = () => entity()?.state === "playing";

  const mediaTitle = createMemo(() => getEntityAttribute<string>(entity()!, "media_title") ?? "");
  const mediaArtist = createMemo(() => getEntityAttribute<string>(entity()!, "media_artist") ?? "");
  const albumArt = createMemo(
    () => getEntityAttribute<string>(entity()!, "entity_picture") ?? undefined,
  );

  const handleTap = () => {
    const id = entityId();
    if (id) {
      callService("media_player" as any, "media_play_pause" as any, {}, { entity_id: id });
    }
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

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
            <MediaPlayerContent
              state={e().state}
              title={mediaTitle() || props.config.title || e().friendlyName || "Media"}
              artist={mediaArtist()}
              albumArt={albumArt()}
              isPlaying={isPlaying()}
            />
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
        controlsContent={<MediaPlayerControls entity={entity} />}
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

interface MediaPlayerContentProps {
  state: string;
  title: string;
  artist: string;
  albumArt: string | undefined;
  isPlaying: boolean;
}

// Must render inside <Widget>: the top-level widget scope only sees the stub
// context whose dimensions() is always (0,0), so size checks there never react.
function MediaPlayerContent(props: MediaPlayerContentProps) {
  const ctx = useWidgetContext();
  // Compact layout when widget is ≤ 2 cells wide (≈ 300 px) OR ≤ 2 cells tall.
  // Equivalent to the old `xs`/`sm` tiers (area ≤ 4).
  const isSmall = () => {
    const d = ctx.dimensions();
    return d.width <= 300 || d.height <= 150;
  };

  return (
    <Widget.Content>
      <Show
        when={!isSmall()}
        fallback={
          /* xs/sm: thumbnail + play icon overlay + truncated title */
          <div class="flex h-full items-center gap-2 overflow-hidden">
            <div class="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
              <Show
                when={props.albumArt}
                fallback={
                  <div class="flex h-full w-full items-center justify-center bg-muted">
                    <Icon icon="mdi:music" width={20} />
                  </div>
                }
              >
                <img src={props.albumArt} alt="" class="h-full w-full object-cover" />
              </Show>
              <div class="absolute inset-0 flex items-center justify-center bg-black/30">
                <Icon icon={getMediaIcon(props.state)} width={16} class="text-foreground" />
              </div>
            </div>
            <div class="flex flex-col overflow-hidden">
              <Widget.Title>{props.title}</Widget.Title>
              <Show when={props.artist}>
                <Widget.Status>{props.artist}</Widget.Status>
              </Show>
            </div>
          </div>
        }
      >
        {/* md+: vinyl record + title/artist */}
        <div class="flex h-full items-center gap-3">
          <div class="h-14 w-14 flex-shrink-0">
            <VinylRecord imageUrl={props.albumArt} isPlaying={props.isPlaying} />
          </div>
          <div class="flex flex-col gap-1 overflow-hidden">
            <Widget.Title>{props.title}</Widget.Title>
            <Show when={props.artist}>
              <Widget.Status>{props.artist}</Widget.Status>
            </Show>
            <span class="flex items-center gap-1 text-xs opacity-60">
              <Icon icon={getMediaIcon(props.state)} width={12} />
              <span class="capitalize">{props.state}</span>
            </span>
          </div>
        </div>
      </Show>
    </Widget.Content>
  );
}

export default defineWidget<MediaPlayerConfig>({
  manifest: {
    name: "Media Player",
    description: "Media playback controls with album art and progress tracking",
    icon: "mdi:music",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
  },
  configSchema,
  component: MediaPlayerWidget,
});
