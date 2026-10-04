import {
  getWebRtcClientConfig,
  sendWebRtcCandidate,
  startWebRtcSession,
} from "@glasshome/widget-sdk";
import { reasonOf } from "../reason";
import type { CameraSource } from "../sources";
import type { DriverCallbacks, MediaDriver } from "./types";

export function createWebRtcDriver(entityId: string): MediaDriver {
  let pc: RTCPeerConnection | null = null;
  let unsubscribe: (() => Promise<void>) | null = null;
  let el: HTMLVideoElement | null = null;
  let onPlaying: (() => void) | null = null;
  let stopped = false;
  let iceRestarted = false;
  let playing = false;
  let stage = "config";

  const stop = () => {
    stopped = true;
    if (el && onPlaying) el.removeEventListener("playing", onPlaying);
    // The next kind reuses this <video>, and a leftover srcObject wins over its src.
    if (el) el.srcObject = null;
    el = null;
    onPlaying = null;
    unsubscribe?.().catch(() => {});
    unsubscribe = null;
    if (pc) {
      pc.close();
      pc = null;
    }
  };

  const start = (
    element: HTMLVideoElement | HTMLImageElement,
    _source: CameraSource,
    cb: DriverCallbacks,
  ) => {
    el = element as HTMLVideoElement;
    onPlaying = () => {
      playing = true;
      cb.onLive();
    };
    el.addEventListener("playing", onPlaying);

    void (async () => {
      try {
        let rtcConfig: RTCConfiguration;
        try {
          rtcConfig = (await getWebRtcClientConfig(entityId)).configuration as RTCConfiguration;
        } catch {
          // HA has no client config for this camera; Google's STUN is the public default.
          rtcConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };
        }
        if (stopped) return;

        const peer = new RTCPeerConnection(rtcConfig);
        pc = peer;

        peer.ontrack = (event) => {
          if (event.streams[0] && el) el.srcObject = event.streams[0];
        };
        peer.onconnectionstatechange = () => {
          if (peer.connectionState !== "failed") return;
          if (!playing) {
            cb.onError("ice connection failed");
          } else if (!iceRestarted) {
            iceRestarted = true;
            peer.restartIce();
          } else {
            cb.onStale("ice connection failed after restart");
          }
        };
        peer.addTransceiver("audio", { direction: "recvonly" });
        peer.addTransceiver("video", { direction: "recvonly" });

        stage = "local offer";
        const offer = await peer.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await peer.setLocalDescription(offer);
        if (stopped) return;

        let sessionId: string | null = null;
        const pending: RTCIceCandidateInit[] = [];
        peer.onicecandidate = (event) => {
          if (!event.candidate) return;
          const init = event.candidate.toJSON();
          if (sessionId) {
            sendWebRtcCandidate(entityId, sessionId, init as Record<string, unknown>).catch(
              () => {},
            );
          } else {
            pending.push(init);
          }
        };

        const offerSdp = offer.sdp;
        if (!offerSdp) throw new Error("offer has no sdp");
        stage = "home assistant answer";
        const { answer, session } = await startWebRtcSession(entityId, offerSdp, (candidate) => {
          const init = { ...candidate } as RTCIceCandidateInit;
          if (!init.sdpMid && init.sdpMLineIndex == null) init.sdpMid = "0";
          peer.addIceCandidate(new RTCIceCandidate(init)).catch(() => {});
        });
        unsubscribe = session.unsubscribe;
        if (stopped) {
          unsubscribe?.().catch(() => {});
          return;
        }
        sessionId = session.sessionId;
        for (const c of pending) {
          if (sessionId) {
            sendWebRtcCandidate(entityId, sessionId, c as Record<string, unknown>).catch(() => {});
          }
        }
        pending.length = 0;

        stage = "remote description";
        await peer.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answer }));
      } catch (err) {
        if (!stopped) cb.onError(`${stage}: ${reasonOf(err)}`);
      }
    })();
  };

  const describe = () => `stage ${stage}, connection ${pc?.connectionState ?? "none"}`;

  return { kind: "webrtc", start, stop, describe };
}
