import { Badge } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import {
  type Accessor,
  createMemo,
  createSignal,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from "solid-js";
import noFeedArt from "./assets/no-feed.webp";
import type { CameraPlayer } from "./create-player";
import type { PlayerStatus } from "./player";

const MEDIA_CLASS = "absolute inset-0 h-full w-full object-cover";

function BoundVideo(props: { player: CameraPlayer; poster?: string; class?: string }) {
  let ref!: HTMLVideoElement;
  onMount(() => props.player.bindEl(ref));
  return <video ref={ref} autoplay muted playsinline poster={props.poster} class={props.class} />;
}

function BoundImage(props: { player: CameraPlayer; poster?: string; class?: string }) {
  let ref!: HTMLImageElement;
  onMount(() => props.player.bindEl(ref));
  return <img ref={ref} src={props.poster} alt="" class={props.class} />;
}

/** The picture layers alone: placeholder, last frame, live stream. The tile and the panel share it. */
export function CameraFeed(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  active: Accessor<boolean>;
  class?: string;
}) {
  const status = props.player.status;
  // Hidden until it loads: a failed poster otherwise paints the broken-image glyph.
  const [posterLoaded, setPosterLoaded] = createSignal(false);
  // A dialog may also build its panel detached; only a feed in the document may claim the player.
  const [attached, setAttached] = createSignal(false);
  let placeholder!: HTMLImageElement;
  onMount(() => {
    const frame = requestAnimationFrame(() => setAttached(placeholder.isConnected));
    onCleanup(() => cancelAnimationFrame(frame));
  });

  const streaming = () =>
    status() === "connecting" || status() === "reconnecting" || status() === "live";
  const connecting = () => status() === "connecting" || status() === "reconnecting";

  return (
    <>
      <img
        ref={placeholder}
        src={noFeedArt}
        alt=""
        class={`${props.class ?? ""} ${connecting() ? "animate-pulse" : ""}`}
      />
      <Show when={props.poster() !== undefined}>
        <img
          src={props.poster()}
          alt=""
          class={props.class}
          style={{ visibility: posterLoaded() ? "visible" : "hidden" }}
          onLoad={() => setPosterLoaded(true)}
          onError={() => setPosterLoaded(false)}
        />
      </Show>
      <Show when={props.active() && attached() && streaming()}>
        <StreamElement player={props.player} poster={props.poster()} class={props.class} />
      </Show>
    </>
  );
}

const BADGE: Record<PlayerStatus, { label: string; tone: string }> = {
  offline: { label: "Offline", tone: "var(--destructive)" },
  live: { label: "Live", tone: "var(--success)" },
  "no-signal": { label: "No signal", tone: "var(--destructive)" },
  connecting: { label: "Connecting", tone: "var(--warning)" },
  reconnecting: { label: "Connecting", tone: "var(--warning)" },
};

export const statusBadge = (status: PlayerStatus) => BADGE[status];

export function CameraView(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  name: Accessor<string>;
  active: Accessor<boolean>;
}) {
  const badge = createMemo(() => statusBadge(props.player.status()));

  const overlay = createMemo(() => {
    switch (props.player.status()) {
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
      <CameraFeed
        player={props.player}
        poster={props.poster}
        active={props.active}
        class={MEDIA_CLASS}
      />

      <Show when={props.active()}>
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ visibility: overlay() ? "visible" : "hidden" }}
        >
          <div class="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-white [--glass-base:oklch(0.15_0_0/0.55)] [--glass-edge:transparent] [--glass-light:0]">
            <Icon icon={overlay()?.icon ?? "mdi:cctv-off"} width={16} class="text-white/90" />
            <span class="font-medium text-[11px] text-white/90">{overlay()?.label}</span>
          </div>
        </div>
      </Show>

      <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pt-2 pb-6">
        <span class="glass min-w-0 truncate rounded-full px-2.5 py-0.5 font-medium text-white text-xs [--glass-base:oklch(0.15_0_0/0.55)] [--glass-edge:transparent] [--glass-light:0]">
          {props.name()}
        </span>
        <Badge tone={badge().tone}>{badge().label}</Badge>
      </div>
    </div>
  );
}

function StreamElement(props: { player: CameraPlayer; poster?: string; class?: string }) {
  const kind = props.player.activeKind;
  return (
    <Switch>
      <Match when={kind() === "webrtc" || kind() === "hls"}>
        <BoundVideo player={props.player} poster={props.poster} class={props.class} />
      </Match>
      <Match when={kind() === "mjpeg" || kind() === "snapshot"}>
        <BoundImage player={props.player} class={props.class} />
      </Match>
    </Switch>
  );
}
