import { Badge } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  Match,
  onMount,
  Show,
  Switch,
} from "solid-js";
import noFeedArt from "./assets/no-feed.webp";
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
  return <img ref={ref} src={props.poster} alt="" class={MEDIA_CLASS} />;
}

export function CameraView(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  name: Accessor<string>;
  active: Accessor<boolean>;
}) {
  const status = props.player.status;

  // A failed poster otherwise paints the browser's broken-image glyph over the chrome.
  const [posterFailed, setPosterFailed] = createSignal(false);
  createEffect(() => {
    props.poster();
    setPosterFailed(false);
  });

  const streaming = () =>
    status() === "connecting" || status() === "reconnecting" || status() === "live";
  const connecting = () => status() === "connecting" || status() === "reconnecting";

  const badge = createMemo(() => {
    switch (status()) {
      case "offline":
        return { label: "Offline", tone: "var(--destructive)" };
      case "live":
        return { label: "Live", tone: "var(--success)" };
      case "no-signal":
        return { label: "No signal", tone: "var(--destructive)" };
      case "connecting":
      case "reconnecting":
        return { label: "Connecting", tone: "var(--warning)" };
      default:
        return { label: "Idle", tone: "var(--warning)" };
    }
  });

  const overlay = createMemo(() => {
    switch (status()) {
      case "no-signal":
        return { icon: "mdi:cctv-off", label: "No signal · tap to retry" };
      case "offline":
        return { icon: "mdi:cctv-off", label: "Camera offline" };
      default:
        return undefined;
    }
  });

  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <img src={noFeedArt} alt="" class={`${MEDIA_CLASS} ${connecting() ? "animate-pulse" : ""}`} />

      <Show when={!posterFailed() && props.poster()}>
        <img
          src={props.poster()}
          alt=""
          class={MEDIA_CLASS}
          onError={() => setPosterFailed(true)}
        />
      </Show>

      <Show when={props.active() && streaming()}>
        <StreamElement player={props.player} poster={props.poster()} />
      </Show>

      <Show when={props.active() && overlay()}>
        {(o) => (
          <div class="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div class="flex items-center gap-2 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
              <Icon icon={o().icon} width={16} class="text-white/90" />
              <span class="font-medium text-[11px] text-white/90">{o().label}</span>
            </div>
          </div>
        )}
      </Show>

      <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pt-2 pb-6">
        <span class="min-w-0 truncate rounded-full bg-black/45 px-2.5 py-0.5 font-medium text-white text-xs backdrop-blur-sm">
          {props.name()}
        </span>
        <Badge tone={badge().tone}>{badge().label}</Badge>
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
