import { Badge } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { type Accessor, createMemo, Match, onMount, Show, Switch } from "solid-js";
import type { CameraPlayer } from "./create-player";

const MEDIA_CLASS = "absolute inset-0 h-full w-full object-cover";

function BoundVideo(props: { player: CameraPlayer; poster?: string }) {
  let ref!: HTMLVideoElement;
  onMount(() => props.player.bindEl(ref));
  return <video ref={ref} autoplay muted playsinline poster={props.poster} class={MEDIA_CLASS} />;
}

function BoundImage(props: { player: CameraPlayer; poster?: string }) {
  let ref!: HTMLImageElement;
  onMount(() => props.player.bindEl(ref));
  return <img ref={ref} src={props.poster} alt="Camera stream" class={MEDIA_CLASS} />;
}

export function CameraView(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  name: Accessor<string>;
  active: Accessor<boolean>;
}) {
  const status = props.player.status;

  const streaming = () =>
    status() === "connecting" || status() === "reconnecting" || status() === "live";
  const connecting = () => status() === "connecting" || status() === "reconnecting";

  const badge = createMemo(() => {
    switch (status()) {
      case "offline":
        return { label: "Offline", tone: "var(--destructive)" };
      case "live":
        return { label: "Live", tone: "var(--success)" };
      default:
        return { label: "Idle", tone: "var(--warning)" };
    }
  });

  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <Show when={props.poster()}>
        <img src={props.poster()} alt={props.name()} class={MEDIA_CLASS} />
      </Show>

      <Show when={props.active() && streaming()}>
        <StreamElement player={props.player} poster={props.poster()} />
      </Show>

      <Show when={props.active() && connecting()}>
        <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div class="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
            <Icon icon="mdi:loading" width={16} class="animate-spin text-white/90" />
            <span class="font-medium text-[11px] text-white/90">Connecting…</span>
          </div>
        </div>
      </Show>

      <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pt-2 pb-6">
        <span class="min-w-0 truncate rounded-full bg-black/45 px-2.5 py-0.5 font-medium text-white text-xs backdrop-blur-sm">
          {props.name()}
        </span>
        <Badge tone={badge().tone} class="uppercase tracking-wide">
          {badge().label}
        </Badge>
      </div>
    </div>
  );
}

function StreamElement(props: { player: CameraPlayer; poster?: string }) {
  const kind = props.player.activeKind;
  return (
    <Switch>
      <Match when={kind() === "webrtc" || kind() === "hls"}>
        <BoundVideo player={props.player} poster={props.poster} />
      </Match>
      <Match when={kind() === "mjpeg" || kind() === "snapshot"}>
        <BoundImage player={props.player} />
      </Match>
    </Switch>
  );
}
