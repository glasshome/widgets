import {
  defineConfig,
  defineWidget,
  field,
  getEntityAttribute,
  hassMediaUrl,
  type Infer,
  useEntity,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, onCleanup, Show } from "solid-js";
import type { WidgetDebugData } from "../common";
import { buildDebugData, WidgetDebugView, widgetDialogProps } from "../common";
import { CameraView } from "./camera-view";
import { createCameraPlayer } from "./create-player";
import { resolveSources, type StreamEngine } from "./sources";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entity("camera"),
  streamEngine: field.choice(["auto", "webrtc", "hls", "mjpeg", "snapshot"], {
    title: "Stream Engine",
    default: "auto",
  }),
  refreshInterval: field.number({ title: "Snapshot Refresh (seconds)", default: 10 }),
});
type CameraConfig = Infer<typeof configSchema>;

function CameraWidget(props: { config: CameraConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entityId = () => props.config.entityIds[0] ?? "";
  const entity = useEntity(entityId);
  const engine = () => (props.config.streamEngine ?? "auto") as StreamEngine;

  const offline = () => {
    const s = entity()?.state;
    return !s || s === "unavailable" || s === "unknown";
  };
  const attr = (name: string) => {
    const e = entity();
    return e ? (getEntityAttribute<string>(e, name) ?? null) : null;
  };

  const sources = createMemo(() =>
    resolveSources(
      {
        entityId: entityId(),
        entityPicture: attr("entity_picture"),
        accessToken: attr("access_token"),
      },
      engine(),
    ),
  );

  const player = createCameraPlayer({
    entityId,
    sources,
    offline,
    refreshMs: () => (props.config.refreshInterval ?? 10) * 1000,
  });
  onCleanup(player.dispose);

  const name = createMemo(() => props.config.title || entity()?.friendlyName || "Camera");

  const poster = createMemo(() => {
    const picture = attr("entity_picture");
    const url = picture ? hassMediaUrl(picture) : undefined;
    if (!url) return undefined;
    const n = player.nonce();
    return n > 0 ? `${url}${url.includes("?") ? "&" : "?"}_f=${n}` : url;
  });

  const gestures = useWidgetGestures(() => ({
    tap: player.retry,
    hold: { action: openDialog },
  }));
  onCleanup(gestures.dispose);

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const e = entity();
    if (!e) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, [e], {
      status: player.status(),
      activeKind: player.activeKind(),
      sources: sources().map((s) => s.kind),
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
          <CameraView player={player} poster={poster} name={name} active={() => !showDialog()} />
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
            <div class="relative aspect-video overflow-hidden rounded-lg">
              <CameraView player={player} poster={poster} name={name} active={() => showDialog()} />
            </div>
            <div class="flex items-center gap-2 text-muted-foreground text-sm">
              <Icon icon="mdi:cctv" width={16} />
              <span>{name()}</span>
              <span class="capitalize opacity-60">{entity()?.state ?? "unknown"}</span>
            </div>
          </div>
        }
        debugContent={<Show when={debugData()}>{(d) => <WidgetDebugView data={d()} />}</Show>}
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
    maxSize: { w: 12, h: 10 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Front Door",
        size: { w: 3, h: 2 },
        config: {
          entityIds: ["camera.front_door_camera"],
          title: "Front Door",
          streamEngine: "auto",
          refreshInterval: 10,
        },
      },
    ],
  },
  configSchema,
  component: CameraWidget,
});
