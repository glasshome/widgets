import { Button, type PanelFact, PanelFacts } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { type Accessor, createSignal, onCleanup, onMount, type Setter, Show } from "solid-js";
import { CameraView } from "./camera-view";
import type { CameraPlayer } from "./create-player";
import type { SourceKind } from "./sources";

const SOURCE_LABEL: Record<SourceKind, string> = {
  webrtc: "WebRTC",
  hls: "HLS",
  mjpeg: "MJPEG",
  snapshot: "Snapshots",
};

export interface CameraFacts {
  model: string | null;
  motionDetection: boolean | null;
}

export function CameraLiveView(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  name: Accessor<string>;
  muted: Accessor<boolean>;
  setMuted: Setter<boolean>;
  facts: Accessor<CameraFacts>;
}) {
  let stage!: HTMLDivElement;
  const [fullscreen, setFullscreen] = createSignal(false);
  const canFullscreen = typeof document !== "undefined" && document.fullscreenEnabled;

  onMount(() => {
    const sync = () => setFullscreen(document.fullscreenElement === stage);
    document.addEventListener("fullscreenchange", sync);
    onCleanup(() => {
      document.removeEventListener("fullscreenchange", sync);
      if (document.fullscreenElement === stage) void document.exitFullscreen();
    });
  });

  const toggleFullscreen = () => {
    if (fullscreen()) void document.exitFullscreen();
    else void stage.requestFullscreen();
  };

  const lost = () => {
    const s = props.player.status();
    return s === "no-signal" || s === "offline";
  };

  const facts = (): PanelFact[] => {
    const items: PanelFact[] = [];
    const kind = props.player.activeKind();
    if (kind) items.push({ icon: "mdi:access-point", label: "Stream", value: SOURCE_LABEL[kind] });
    if (props.player.status() === "live" && kind !== "mjpeg" && kind !== "snapshot") {
      items.push({
        icon: props.player.hasAudio() ? "mdi:microphone" : "mdi:microphone-off",
        label: "Sound",
        value: props.player.hasAudio() ? "Available" : "None",
      });
    }
    const { model, motionDetection } = props.facts();
    if (motionDetection !== null) {
      items.push({
        icon: "mdi:motion-sensor",
        label: "Motion detection",
        value: motionDetection ? "On" : "Off",
      });
    }
    if (model) items.push({ icon: "mdi:cctv", label: "Model", value: model });
    return items;
  };

  return (
    <div class="flex flex-col gap-4">
      <div
        ref={stage}
        class="relative aspect-video w-full overflow-hidden rounded-xl bg-black [&:fullscreen]:rounded-none"
      >
        <CameraView
          player={props.player}
          poster={props.poster}
          name={props.name}
          active={() => true}
          muted={props.muted}
          setMuted={props.setMuted}
          variant="live"
          actions={
            <>
              <Show when={lost()}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Retry"
                  onClick={props.player.retry}
                >
                  <Icon icon="mdi:refresh" width={18} />
                </Button>
              </Show>
              <Show when={canFullscreen}>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={fullscreen() ? "Exit full screen" : "Full screen"}
                  onClick={toggleFullscreen}
                >
                  <Icon icon={fullscreen() ? "mdi:fullscreen-exit" : "mdi:fullscreen"} width={18} />
                </Button>
              </Show>
            </>
          }
        />
      </div>
      <Show when={facts().length > 0}>
        <PanelFacts items={facts()} />
      </Show>
    </div>
  );
}
