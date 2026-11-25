import { Button, Icon, type PanelFact, PanelFacts, useTranslation } from "@glasshome/widget-sdk";
import { type Accessor, type Setter, Show } from "solid-js";
import { CameraView } from "./camera-view";
import type { CameraPlayer } from "./create-player";
import type { SourceKind } from "./sources";

const SOURCE_LABEL: Record<SourceKind, string> = {
  webrtc: "camera.source.webrtc",
  hls: "camera.source.hls",
  mjpeg: "camera.source.mjpeg",
  snapshot: "camera.source.snapshots",
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
  const { t } = useTranslation();
  const lost = () => {
    const s = props.player.status();
    return s === "no-signal" || s === "offline";
  };

  const facts = (): PanelFact[] => {
    const items: PanelFact[] = [];
    const kind = props.player.activeKind();
    if (kind)
      items.push({
        icon: "mdi:access-point",
        label: t("camera.facts.stream"),
        value: t(SOURCE_LABEL[kind]),
      });
    if (props.player.status() === "live" && kind !== "mjpeg" && kind !== "snapshot") {
      items.push({
        icon: props.player.hasAudio() ? "mdi:microphone" : "mdi:microphone-off",
        label: t("camera.facts.sound"),
        value: props.player.hasAudio()
          ? t("camera.facts.sound-available")
          : t("camera.facts.sound-none"),
      });
    }
    const { model, motionDetection } = props.facts();
    if (motionDetection !== null) {
      items.push({
        icon: "mdi:motion-sensor",
        label: t("camera.facts.motion"),
        value: motionDetection ? t("camera.facts.motion-on") : t("camera.facts.motion-off"),
      });
    }
    if (model) items.push({ icon: "mdi:cctv", label: t("camera.facts.model"), value: model });
    return items;
  };

  return (
    <div class="flex flex-col gap-4">
      <div class="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <CameraView
          player={props.player}
          poster={props.poster}
          name={props.name}
          active={() => true}
          muted={props.muted}
          setMuted={props.setMuted}
          variant="live"
          fullscreen
          actions={
            <Show when={lost()}>
              <Button
                variant="outline"
                size="icon"
                aria-label={t("camera.controls.retry")}
                onClick={props.player.retry}
              >
                <Icon icon="mdi:refresh" width={18} />
              </Button>
            </Show>
          }
        />
      </div>
      <Show when={facts().length > 0}>
        <PanelFacts items={facts()} />
      </Show>
    </div>
  );
}
