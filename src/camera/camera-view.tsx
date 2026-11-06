import { Badge, Button, CameraStream } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import {
  type Accessor,
  createMemo,
  createSignal,
  type JSX,
  Match,
  onMount,
  type Setter,
  Show,
  Switch,
} from "solid-js";
import noFeedArt from "./assets/no-feed.webp";
import type { CameraPlayer } from "./create-player";

export type CameraVariant = "tile" | "live";

const MEDIA_CLASS: Record<CameraVariant, string> = {
  tile: "absolute inset-0 h-full w-full object-cover",
  live: "absolute inset-0 h-full w-full object-contain",
};

const FIT: Record<CameraVariant, "cover" | "contain"> = { tile: "cover", live: "contain" };

function BoundImage(props: { player: CameraPlayer; poster?: string; class: string }) {
  let ref!: HTMLImageElement;
  onMount(() => props.player.bindEl(ref));
  return <img ref={ref} src={props.poster} alt="" class={props.class} />;
}

const RETRY_HINT: Record<CameraVariant, string> = {
  tile: "No signal · tap to retry",
  live: "No signal",
};

export function CameraView(props: {
  player: CameraPlayer;
  poster: Accessor<string | undefined>;
  name: Accessor<string>;
  active: Accessor<boolean>;
  muted: Accessor<boolean>;
  setMuted: Setter<boolean>;
  variant?: CameraVariant;
  fullscreen?: boolean;
  actions?: JSX.Element;
}) {
  const status = props.player.status;
  const variant = () => props.variant ?? "tile";
  const mediaClass = () => MEDIA_CLASS[variant()];

  // Hidden until it loads: a failed poster otherwise paints the broken-image glyph.
  const [posterLoaded, setPosterLoaded] = createSignal(false);

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
        return { icon: "mdi:cctv-off", label: RETRY_HINT[variant()] };
      case "offline":
        return { icon: "mdi:cctv-off", label: "Camera offline" };
      default:
        return undefined;
    }
  });

  const sound = () => props.active() && status() === "live" && props.player.hasAudio();

  return (
    <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
      <Show when={variant() === "tile" || status() !== "live"}>
        <img
          src={noFeedArt}
          alt=""
          class={`${MEDIA_CLASS.tile} ${connecting() ? "animate-pulse" : ""}`}
        />
      </Show>

      <Show when={props.poster() !== undefined}>
        <img
          src={props.poster()}
          alt=""
          class={mediaClass()}
          style={{ visibility: posterLoaded() ? "visible" : "hidden" }}
          onLoad={() => setPosterLoaded(true)}
          onError={() => setPosterLoaded(false)}
        />
      </Show>

      <Show when={props.active() && streaming()}>
        <StreamElement
          player={props.player}
          poster={props.poster()}
          muted={props.muted()}
          fit={FIT[variant()]}
          fullscreen={props.fullscreen ?? false}
          class={mediaClass()}
        />
      </Show>

      <Show when={props.active()}>
        <div
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
          style={{ visibility: overlay() ? "visible" : "hidden" }}
        >
          <div class="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-white [--glass-base:oklch(0.15_0_0/0.55)] [--glass-edge:transparent] [--glass-light:0]">
            <Icon icon={overlay()?.icon ?? "mdi:cctv-off"} width={16} class="text-white/90" />
            <span class="text-[11px] font-medium text-white/90">{overlay()?.label}</span>
          </div>
        </div>
      </Show>

      <Show
        when={variant() === "tile"}
        fallback={
          <div class="pointer-events-none absolute top-3 right-3">
            <Badge tone={badge().tone}>{badge().label}</Badge>
          </div>
        }
      >
        <div class="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 bg-gradient-to-b from-black/50 to-transparent px-3 pt-2 pb-6">
          <span class="glass min-w-0 truncate rounded-full px-2.5 py-0.5 text-xs font-medium text-white [--glass-base:oklch(0.15_0_0/0.55)] [--glass-edge:transparent] [--glass-light:0]">
            {props.name()}
          </span>
          <Badge tone={badge().tone}>{badge().label}</Badge>
        </div>
      </Show>

      <div class="absolute right-3 bottom-3 flex items-center gap-2">
        {props.actions}
        <Show when={sound()}>
          <Button
            variant={props.muted() ? "outline" : "default"}
            size="icon"
            aria-label={props.muted() ? "Turn sound on" : "Turn sound off"}
            aria-pressed={!props.muted()}
            onClick={() => props.setMuted((m) => !m)}
          >
            <Icon icon={props.muted() ? "mdi:volume-off" : "mdi:volume-high"} width={18} />
          </Button>
        </Show>
      </div>
    </div>
  );
}

function StreamElement(props: {
  player: CameraPlayer;
  poster?: string;
  muted: boolean;
  fit: "cover" | "contain";
  fullscreen: boolean;
  class: string;
}) {
  const kind = props.player.activeKind;
  return (
    <Switch>
      <Match when={props.player.video()} keyed>
        {(attempt) => (
          <CameraStream
            entityId={attempt.entityId}
            kind={attempt.kind}
            muted={props.muted}
            poster={props.poster}
            fit={props.fit}
            fullscreen={props.fullscreen}
            class={props.class}
            onLive={attempt.onLive}
            onAudio={attempt.onAudio}
            onError={attempt.onError}
            onStale={attempt.onStale}
          />
        )}
      </Match>
      <Match when={kind() === "mjpeg" || kind() === "snapshot"}>
        <BoundImage player={props.player} class={props.class} />
      </Match>
    </Switch>
  );
}
