import { Button, Icon, WidgetPanel } from "@glasshome/widget-sdk";
import { type Accessor, Show } from "solid-js";
import { CameraFeed, statusBadge } from "./camera-view";
import type { CameraPlayer } from "./create-player";

/** The camera, held: its live picture edge to edge, and what the camera can do. */
export function CameraPanel(props: {
  name: string;
  state: string | undefined;
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  active: Accessor<boolean>;
}) {
  const off = () => props.state === "off";
  const failed = () => {
    const s = props.player.status();
    return s === "no-signal" || s === "offline";
  };

  const savePicture = () => {
    const src = props.poster();
    if (!src) return;
    const link = document.createElement("a");
    link.href = src;
    link.download = `${props.name}.jpg`;
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  };

  return (
    <WidgetPanel
      icon="mdi:cctv"
      eyebrow={statusBadge(props.player.status()).label}
      name={props.name}
      backdrop={<CameraFeed player={props.player} poster={props.poster} active={props.active} />}
      actions={
        <>
          <Show when={props.poster()}>
            <Button variant="outline" onClick={savePicture}>
              <Icon icon="mdi:camera" width={18} />
              Save picture
            </Button>
          </Show>
          <Show when={failed() && !off()}>
            <Button variant="outline" onClick={props.player.retry}>
              <Icon icon="mdi:refresh" width={18} />
              Reconnect
            </Button>
          </Show>
        </>
      }
    />
  );
}
