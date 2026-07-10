import {
  getWebRtcClientConfig,
  sendWebRtcCandidate,
  startWebRtcSession,
} from "@glasshome/widget-sdk";
import Hls from "hls.js";
import { createEffect, createSignal, Match, onCleanup, Switch } from "solid-js";

export type StreamMode = "webrtc" | "hls" | "mjpeg" | "snapshot";

interface StreamPlayerProps {
  mode: StreamMode;
  entityId?: string;
  hlsUrl?: string | null;
  mjpegUrl?: string | null;
  snapshotUrl?: string | null;
  refreshInterval?: number;
  poster?: string;
  onError?: () => void;
  onActive?: () => void;
}

const PLAYER_CLASS = "h-full w-full rounded-[inherit] object-cover";
const MAX_NETWORK_RETRIES = 2;
// Idle/battery cameras can complete WebRTC signaling yet never send a track.
// Without a track no error fires, so fall through to the next protocol.
const WEBRTC_TRACK_TIMEOUT_MS = 8000;

function WebRtcMode(props: {
  entityId: string;
  poster?: string;
  onError?: () => void;
  onActive?: () => void;
}) {
  let videoRef!: HTMLVideoElement;
  let pc: RTCPeerConnection | null = null;
  let sessionUnsubscribe: (() => Promise<void>) | null = null;

  const cleanup = () => {
    sessionUnsubscribe?.();
    sessionUnsubscribe = null;
    if (pc) {
      pc.close();
      pc = null;
    }
  };

  createEffect(() => {
    const id = props.entityId;
    if (!id) return;

    cleanup();
    let cancelled = false;
    let gotTrack = false;
    const watchdog = setTimeout(() => {
      if (!cancelled && !gotTrack) {
        cleanup();
        props.onError?.();
      }
    }, WEBRTC_TRACK_TIMEOUT_MS);
    onCleanup(() => {
      cancelled = true;
      clearTimeout(watchdog);
    });

    (async () => {
      try {
        // Get STUN/TURN config from HA
        let rtcConfig: RTCConfiguration;
        try {
          const clientConfig = await getWebRtcClientConfig(id);
          rtcConfig = clientConfig.configuration as RTCConfiguration;
        } catch {
          rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        }

        if (cancelled) return;

        // Create peer connection
        const peerConnection = new RTCPeerConnection(rtcConfig);
        pc = peerConnection;

        // Set up track handler
        peerConnection.ontrack = (event) => {
          gotTrack = true;
          clearTimeout(watchdog);
          if (event.streams[0]) {
            videoRef.srcObject = event.streams[0];
          }
        };

        // ICE restart on failure
        peerConnection.onconnectionstatechange = () => {
          if (peerConnection.connectionState === "failed") {
            peerConnection.restartIce();
          }
        };

        // Add receive-only transceivers
        peerConnection.addTransceiver("audio", { direction: "recvonly" });
        peerConnection.addTransceiver("video", { direction: "recvonly" });

        // Create and set local offer
        const offer = await peerConnection.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peerConnection.setLocalDescription(offer);

        // Start WebRTC session -- subscription-based signaling
        let sessionId: string | null = null;
        const pendingCandidates: RTCIceCandidateInit[] = [];

        // Handle local ICE candidates -- queue until session ID received
        peerConnection.onicecandidate = (event) => {
          if (!event.candidate) return;
          const candidateInit = event.candidate.toJSON();
          if (sessionId) {
            sendWebRtcCandidate(id, sessionId, candidateInit as Record<string, unknown>).catch(
              () => {},
            );
          } else {
            pendingCandidates.push(candidateInit);
          }
        };

        const { answer, session } = await startWebRtcSession(
          id,
          offer.sdp!,
          // Handle remote ICE candidates from HA
          (candidate: Record<string, unknown>) => {
            const init = { ...candidate } as RTCIceCandidateInit;
            if (!init.sdpMid && init.sdpMLineIndex == null) {
              init.sdpMid = "0";
            }
            peerConnection.addIceCandidate(new RTCIceCandidate(init)).catch(() => {});
          },
        );

        sessionUnsubscribe = session.unsubscribe;
        sessionId = session.sessionId;

        // Flush queued local candidates
        for (const c of pendingCandidates) {
          if (sessionId) {
            sendWebRtcCandidate(id, sessionId, c as Record<string, unknown>).catch(() => {});
          }
        }
        pendingCandidates.length = 0;

        // Set remote answer
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription({ type: "answer", sdp: answer }),
        );
      } catch {
        cleanup();
        if (!cancelled) props.onError?.();
      }
    })();
  });

  onCleanup(cleanup);

  return (
    <video
      ref={videoRef}
      autoplay
      muted
      playsinline
      class={PLAYER_CLASS}
      poster={props.poster}
      onPlaying={() => props.onActive?.()}
    />
  );
}

function HlsMode(props: { url: string; poster?: string; onError?: () => void; onActive?: () => void }) {
  let videoRef!: HTMLVideoElement;
  let hls: Hls | null = null;

  const destroyHls = () => {
    if (hls) {
      hls.destroy();
      hls = null;
    }
  };

  createEffect(() => {
    const url = props.url;
    if (!url) return;

    destroyHls();
    let networkRetries = 0;

    if (Hls.isSupported()) {
      const instance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      instance.loadSource(url);
      instance.attachMedia(videoRef);

      instance.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.MEDIA_ERROR:
              instance.recoverMediaError();
              break;
            case Hls.ErrorTypes.NETWORK_ERROR:
              networkRetries++;
              if (networkRetries <= MAX_NETWORK_RETRIES) {
                setTimeout(() => instance.startLoad(), 2000);
              } else {
                instance.destroy();
                props.onError?.();
              }
              break;
            default:
              instance.destroy();
              props.onError?.();
              break;
          }
        }
      });

      hls = instance;
    } else if (videoRef.canPlayType("application/vnd.apple.mpegurl")) {
      videoRef.src = url;
      videoRef.addEventListener("error", () => props.onError?.(), { once: true });
    }
  });

  onCleanup(destroyHls);

  return (
    <video
      ref={videoRef}
      autoplay
      muted
      playsinline
      class={PLAYER_CLASS}
      poster={props.poster}
      onPlaying={() => props.onActive?.()}
    />
  );
}

function MjpegMode(props: { url: string; poster?: string; onError?: () => void; onActive?: () => void }) {
  return (
    <img
      src={props.url}
      alt="Camera stream"
      class={PLAYER_CLASS}
      onLoad={() => props.onActive?.()}
      onError={() => props.onError?.()}
    />
  );
}

function SnapshotMode(props: {
  url: string;
  refreshInterval: number;
  poster?: string;
  onActive?: () => void;
}) {
  const [src, setSrc] = createSignal(props.url);

  createEffect(() => {
    const baseUrl = props.url;
    const interval = props.refreshInterval;
    if (!baseUrl || interval <= 0) return;

    setSrc(baseUrl);

    const timer = setInterval(() => {
      const separator = baseUrl.includes("?") ? "&" : "?";
      setSrc(`${baseUrl}${separator}_ts=${Date.now()}`);
    }, interval * 1000);

    onCleanup(() => clearInterval(timer));
  });

  return (
    <img
      src={src()}
      alt="Camera snapshot"
      class={PLAYER_CLASS}
      onLoad={() => props.onActive?.()}
      onError={(e) => {
        const el = e.currentTarget;
        if (props.poster) el.src = props.poster;
      }}
    />
  );
}

export function StreamPlayer(props: StreamPlayerProps) {
  return (
    <Switch>
      <Match when={props.mode === "webrtc" && props.entityId}>
        <WebRtcMode
          entityId={props.entityId!}
          poster={props.poster}
          onError={props.onError}
          onActive={props.onActive}
        />
      </Match>
      <Match when={props.mode === "hls" && props.hlsUrl}>
        <HlsMode
          url={props.hlsUrl!}
          poster={props.poster}
          onError={props.onError}
          onActive={props.onActive}
        />
      </Match>
      <Match when={props.mode === "mjpeg" && props.mjpegUrl}>
        <MjpegMode
          url={props.mjpegUrl!}
          poster={props.poster}
          onError={props.onError}
          onActive={props.onActive}
        />
      </Match>
      <Match when={props.mode === "snapshot" && props.snapshotUrl}>
        <SnapshotMode
          url={props.snapshotUrl!}
          refreshInterval={props.refreshInterval ?? 10}
          poster={props.poster}
          onActive={props.onActive}
        />
      </Match>
    </Switch>
  );
}
