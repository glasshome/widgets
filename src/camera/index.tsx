import { getStream, state } from "@glasshome/sync-layer";
import { useCamera, useEntity } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getEntityAttribute,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, EntitySelector, WidgetDebugView, widgetDialogProps } from "../common";
import { type StreamMode, StreamPlayer } from "./stream-player";

interface CameraConfig {
  title?: string;
  entityIds: string[];
  streamEngine?: "auto" | "webrtc" | "hls" | "mjpeg" | "snapshot";
  refreshInterval?: number;
}

const CASCADE: StreamMode[] = ["webrtc", "hls", "mjpeg", "snapshot"];

function CameraWidget(props: { config: CameraConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();
  const [draftEntityIds, setDraftEntityIds] = createSignal<string[]>(props.config.entityIds);
  const hasChanges = () =>
    JSON.stringify(draftEntityIds()) !== JSON.stringify(props.config.entityIds);

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const { stream } = useCamera(entityId);

  const engineSetting = () => props.config.streamEngine ?? "auto";
  const isManualMode = () => engineSetting() !== "auto";

  const [activeMode, setActiveMode] = createSignal<StreamMode>(
    isManualMode() ? (engineSetting() as StreamMode) : "webrtc",
  );

  onMount(() => {
    const id = entityId();
    if (id && activeMode() === "hls") {
      getStream(id, { format: "hls", autoRefresh: true }).catch(() => {});
    }
  });

  const streamUrl = createMemo(() => stream()?.stream?.url ?? null);

  // Pre-fetch HLS stream URL when cascading from WebRTC to HLS
  createEffect(() => {
    const id = entityId();
    if (id && activeMode() === "hls" && !streamUrl()) {
      getStream(id, { format: "hls", autoRefresh: true }).catch(() => {});
    }
  });
  const poster = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    return getEntityAttribute<string>(e, "entity_picture") ?? undefined;
  });

  const accessToken = () => getEntityAttribute<string>(entity(), "access_token") ?? "";

  const mjpegUrl = createMemo(() => {
    const id = entityId();
    const token = accessToken();
    if (!id || !token || !state.hassUrl) return null;
    return `${state.hassUrl}/api/camera_proxy_stream/${id}?token=${token}`;
  });

  const snapshotUrl = createMemo(() => {
    const id = entityId();
    const token = accessToken();
    if (!id || !token || !state.hassUrl) return null;
    return `${state.hassUrl}/api/camera_proxy/${id}?token=${token}`;
  });

  const handleStreamError = () => {
    if (isManualMode()) return;
    const currentIdx = CASCADE.indexOf(activeMode());
    if (currentIdx < CASCADE.length - 1) {
      setActiveMode(CASCADE[currentIdx + 1]);
    }
  };

  const cameraName = createMemo(() => props.config.title || entity()?.friendlyName || "Camera");

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog, delay: 300 },
    }),
    () => ctx.orientation(),
  );
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e], {
      stream: stream(),
      activeMode: activeMode(),
    });
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
                  icon: <Icon icon="mdi:cctv" width={32} />,
                  title: "No camera entity",
                  message: "Hold to configure",
                }
              : undefined
          }
        >
          <Show when={entity()}>
            <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
              <Show
                when={activeMode() !== "hls" || streamUrl()}
                fallback={
                  <Show
                    when={poster()}
                    fallback={
                      <div class="flex h-full w-full items-center justify-center bg-black/50">
                        <Icon icon="mdi:loading" width={32} class="animate-spin text-white/60" />
                      </div>
                    }
                  >
                    <img src={poster()} alt={cameraName()} class="h-full w-full object-cover" />
                  </Show>
                }
              >
                <StreamPlayer
                  mode={activeMode()}
                  entityId={entityId()}
                  hlsUrl={streamUrl()}
                  mjpegUrl={mjpegUrl()}
                  snapshotUrl={snapshotUrl()}
                  refreshInterval={props.config.refreshInterval ?? 10}
                  poster={poster()}
                  onError={handleStreamError}
                />
              </Show>

              <div class="absolute top-0 left-0 rounded-br-lg bg-black/40 px-2 py-1">
                <span class="font-medium text-white text-xs">{cameraName()}</span>
              </div>

              <div class="absolute top-0 right-0 px-2 py-1">
                <div class="flex items-center gap-1 rounded-bl-lg bg-black/40 px-2 py-0.5">
                  <div
                    class={`h-1.5 w-1.5 rounded-full ${
                      entity()?.state === "idle" || !entity() ? "bg-red-400" : "bg-green-400"
                    }`}
                  />
                  <span class="font-medium text-[10px] text-white/80 uppercase">
                    {entity()?.state === "idle" || !entity() ? "Offline" : "Live"}
                  </span>
                </div>
              </div>
            </div>
          </Show>
        </Widget>
      </div>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={(open) => {
          if (!open) setDraftEntityIds(props.config.entityIds);
          setShowDialog(open);
        }}
        title="Camera"
        maxWidth="xl"
        hasUnsavedChanges={hasChanges()}
        onSave={() => {
          ctx.updateConfig({ ...props.config, entityIds: draftEntityIds() });
          setShowDialog(false);
        }}
        editContent={
          <EntitySelector
            entityIds={draftEntityIds()}
            onEntityIdsChange={setDraftEntityIds}
            domain="camera"
          />
        }
        controlsContent={
          <div class="flex flex-col gap-3">
            <div class="aspect-video overflow-hidden rounded-lg">
              <StreamPlayer
                mode={activeMode()}
                entityId={entityId()}
                hlsUrl={streamUrl()}
                mjpegUrl={mjpegUrl()}
                snapshotUrl={snapshotUrl()}
                refreshInterval={props.config.refreshInterval ?? 10}
                poster={poster()}
                onError={handleStreamError}
              />
            </div>
            <div class="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon icon="mdi:cctv" width={16} />
              <span>{cameraName()}</span>
              <span class="capitalize opacity-60">{entity()?.state ?? "unknown"}</span>
            </div>
          </div>
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<CameraConfig>({
  manifest: {
    tag: "glasshome-camera",
    name: "Camera",
    description: "Live camera stream with multi-protocol support",
    icon: "mdi:cctv",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 6 },
    sdkVersion: "^0.2.0",
    schema: {
      type: "object",
      properties: {
        title: { type: "string", title: "Title" },
        entityIds: {
          type: "array",
          title: "Entities",
          items: { type: "string" },
          default: [],
        },
        streamEngine: {
          type: "string",
          title: "Stream Engine",
          enum: ["auto", "webrtc", "hls", "mjpeg", "snapshot"],
          default: "auto",
        },
        refreshInterval: {
          type: "number",
          title: "Snapshot Refresh Interval (seconds)",
          default: 10,
        },
      },
    },
    defaultConfig: { entityIds: [], streamEngine: "auto", refreshInterval: 10 },
  },
  component: CameraWidget,
});
