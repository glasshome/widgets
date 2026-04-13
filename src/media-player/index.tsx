import { useEntity, useService } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getEntityAttribute,
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
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const { callService } = useService();

  const isPlaying = () => entity()?.state === "playing";
  const size = () => ctx.size();
  const isSmall = () => size() === "xs" || size() === "sm";

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

  const gestures = useWidgetGestures(
    () => ({
      tap: handleTap,
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e]);
  });

  return (
    <>
      <div
        class="h-full w-full"
        on:pointerenter={gestures.onPointerEnter}
        on:pointerdown={gestures.onPointerDown}
        on:pointermove={gestures.onPointerMove}
        on:pointerup={gestures.onPointerUp}
        on:pointercancel={gestures.onPointerCancel}
      >
        <Widget
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
            <Widget.Content>
              <Show
                when={!isSmall()}
                fallback={
                  /* xs/sm: thumbnail + play icon overlay + truncated title */
                  <div class="flex h-full items-center gap-2 overflow-hidden">
                    <div class="relative h-10 w-10 flex-shrink-0 overflow-hidden rounded-md">
                      <Show
                        when={albumArt()}
                        fallback={
                          <div class="flex h-full w-full items-center justify-center bg-muted">
                            <Icon icon="mdi:music" width={20} />
                          </div>
                        }
                      >
                        <img src={albumArt()} alt="" class="h-full w-full object-cover" />
                      </Show>
                      <div class="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Icon icon={getMediaIcon(entity()!.state)} width={16} class="text-foreground" />
                      </div>
                    </div>
                    <div class="flex flex-col overflow-hidden">
                      <Widget.Title>
                        {mediaTitle() || props.config.title || entity()?.friendlyName || "Media"}
                      </Widget.Title>
                      <Show when={mediaArtist()}>
                        <Widget.Status>{mediaArtist()}</Widget.Status>
                      </Show>
                    </div>
                  </div>
                }
              >
                {/* md+: vinyl record + title/artist */}
                <div class="flex h-full items-center gap-3">
                  <div class="h-14 w-14 flex-shrink-0">
                    <VinylRecord imageUrl={albumArt()} isPlaying={isPlaying()} />
                  </div>
                  <div class="flex flex-col gap-1 overflow-hidden">
                    <Widget.Title>
                      {mediaTitle() || props.config.title || entity()?.friendlyName || "Media"}
                    </Widget.Title>
                    <Show when={mediaArtist()}>
                      <Widget.Status>{mediaArtist()}</Widget.Status>
                    </Show>
                    <span class="flex items-center gap-1 text-xs opacity-60">
                      <Icon icon={getMediaIcon(entity()!.state)} width={12} />
                      <span class="capitalize">{entity()!.state}</span>
                    </span>
                  </div>
                </div>
              </Show>
            </Widget.Content>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
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

export default defineWidget<MediaPlayerConfig>({
  manifest: {
    name: "Media Player",
    description: "Media playback controls with album art and progress tracking",
    icon: "mdi:music",
    minSize: { w: 2, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: MediaPlayerWidget,
});
