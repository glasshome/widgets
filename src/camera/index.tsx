import {
  defineWidget,
  getEntityAttribute,
  getStream,
  hassMediaUrl,
  useCamera,
  useEntity,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  field,
  defineConfig,
  type Infer,
} from "@glasshome/widget-sdk";
import { Badge } from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, onMount, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { type StreamMode, StreamPlayer } from "./stream-player";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entity("camera"),
  streamEngine: field.choice(["auto", "webrtc", "hls", "mjpeg", "snapshot"], { title: "Stream Engine", default: "auto" }),
  refreshInterval: field.number({ title: "Snapshot Refresh (seconds)", default: 10 }),
});
type CameraConfig = Infer<typeof configSchema>;

const CASCADE: StreamMode[] = ["webrtc", "hls", "mjpeg", "snapshot"];

function CameraWidget(props: { config: CameraConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

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

  // Pre-fetch HLS stream URL when cascading from WebRTC to HLS.
  // A null URL (fetch failed / camera asleep) advances the cascade instead of
  // stalling on the poster with no error to trigger the next protocol.
  createEffect(() => {
    const id = entityId();
    if (id && activeMode() === "hls" && !streamUrl()) {
      getStream(id, { format: "hls", autoRefresh: true })
        .then((data) => {
          if (!data.stream.url) handleStreamError();
        })
        .catch(() => handleStreamError());
    }
  });
  const poster = createMemo(() => {
    const e = entity();
    if (!e) return undefined;
    return hassMediaUrl(getEntityAttribute<string>(e, "entity_picture"));
  });

  const accessToken = () => {
    const e = entity();
    return e ? (getEntityAttribute<string>(e, "access_token") ?? "") : "";
  };

  const mjpegUrl = createMemo(() => {
    const id = entityId();
    const token = accessToken();
    if (!id || !token) return null;
    return hassMediaUrl(`/api/camera_proxy_stream/${id}?token=${token}`) ?? null;
  });

  const snapshotUrl = createMemo(() => {
    const id = entityId();
    const token = accessToken();
    if (!id || !token) return null;
    return hassMediaUrl(`/api/camera_proxy/${id}?token=${token}`) ?? null;
  });

  let cascadeTimer: ReturnType<typeof setTimeout> | null = null;
  const handleStreamError = () => {
    if (isManualMode()) return;
    if (cascadeTimer) return;
    cascadeTimer = setTimeout(() => {
      cascadeTimer = null;
      const currentIdx = CASCADE.indexOf(activeMode());
      if (currentIdx < CASCADE.length - 1) {
        setActiveMode(CASCADE[currentIdx + 1]!);
      }
    }, 100);
  };
  onCleanup(() => {
    if (cascadeTimer) clearTimeout(cascadeTimer);
  });

  const cameraName = createMemo(() => props.config.title || entity()?.friendlyName || "Camera");

  const [isPlaying, setIsPlaying] = createSignal(false);
  // Reset play state when the source protocol or entity changes
  createEffect(() => {
    activeMode();
    entityId();
    setIsPlaying(false);
  });

  const camStatus = createMemo(() => {
    const s = entity()?.state;
    if (!s || s === "unavailable" || s === "unknown") return { label: "Offline", tone: "var(--destructive)" };
    if (isPlaying()) return { label: "Live", tone: "var(--success)" };
    if (s === "idle") return { label: "Idle", tone: "var(--warning)" };
    return { label: "Live", tone: "var(--success)" };
  });

  const gestures = useWidgetGestures(
    () => ({
      hold: { action: openDialog },
    }),
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
      <Widget
        gestures={gestures}
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
                onActive={() => setIsPlaying(true)}
              />
            </Show>

            <Show when={!isPlaying() && camStatus().label !== "Offline"}>
              <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div class="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
                  <Icon icon="mdi:loading" width={16} class="animate-spin text-white/90" />
                  <span class="font-medium text-[11px] text-white/90">Connecting…</span>
                </div>
              </div>
            </Show>

            <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pt-2 pb-6">
              <span class="min-w-0 truncate rounded-full bg-black/45 px-2.5 py-0.5 font-medium text-white text-xs backdrop-blur-sm">
                {cameraName()}
              </span>
              <Badge tone={camStatus().tone} class="uppercase tracking-wide">
                {camStatus().label}
              </Badge>
            </div>
          </div>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Camera"
        maxWidth="xl"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
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
                onActive={() => setIsPlaying(true)}
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
    name: "Camera",
    description: "Live camera stream with multi-protocol support",
    icon: "mdi:cctv",
    minSize: { w: 2, h: 2 },
    maxSize: { w: 4, h: 6 },
    sdkVersion: "^1.0.0",
  },
  configSchema,
  component: CameraWidget,
});
