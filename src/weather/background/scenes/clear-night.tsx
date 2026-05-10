import { For } from "solid-js";
import { streams } from "../seed";

const FAR_COUNT = 26;
const MID_COUNT = 12;
const NEAR_COUNT = 5;

/**
 * Three star planes for parallax depth, milky-way diagonal, crescent moon
 * (body + terminator shadow), and one slow shooting star.
 */
export function ClearNightScene() {
  const [farX, farY, farD, farT] = streams(FAR_COUNT, 1, 2, 3, 4);
  const [midX, midY, midD, midT] = streams(MID_COUNT, 5, 6, 7, 8);
  const [nearX, nearY, nearD, nearT] = streams(NEAR_COUNT, 9, 10, 11, 12);

  return (
    <>
      <div
        class="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 110%, oklch(0.22 0.06 260) 0%, oklch(0.12 0.04 270) 60%, oklch(0.07 0.03 275) 100%)",
        }}
      />

      <div
        class="absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(105deg, transparent 30%, rgba(180,180,255,0.12) 45%, rgba(220,200,255,0.18) 50%, rgba(180,180,255,0.12) 55%, transparent 70%)",
          filter: "blur(10px)",
          "mix-blend-mode": "screen",
        }}
      />

      <For each={farX}>
        {(x, i) => (
          <div
            class="absolute rounded-full bg-white"
            style={{
              left: `${x * 100}%`,
              top: `${(farY[i()] ?? 0) * 75}%`,
              width: "1px",
              height: "1px",
              opacity: 0.4 + (farD[i()] ?? 0) * 0.3,
              animation: `star-twinkle-far ${4 + (farD[i()] ?? 0) * 5}s ease-in-out ${(farT[i()] ?? 0) * 6}s infinite`,
            }}
          />
        )}
      </For>

      <For each={midX}>
        {(x, i) => (
          <div
            class="absolute rounded-full bg-white"
            style={{
              left: `${x * 100}%`,
              top: `${(midY[i()] ?? 0) * 70}%`,
              width: "2px",
              height: "2px",
              "box-shadow": "0 0 4px rgba(255,255,255,0.6)",
              animation: `star-twinkle-mid ${3 + (midD[i()] ?? 0) * 3}s ease-in-out ${(midT[i()] ?? 0) * 4}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>

      <For each={nearX}>
        {(x, i) => (
          <div
            class="star-flare"
            style={{
              left: `${5 + x * 90}%`,
              top: `${5 + (nearY[i()] ?? 0) * 60}%`,
              animation: `star-twinkle-near ${5 + (nearD[i()] ?? 0) * 3}s ease-in-out ${(nearT[i()] ?? 0) * 5}s infinite`,
              "will-change": "transform",
            }}
          />
        )}
      </For>

      <div class="absolute" style={{ right: "12%", top: "14%", width: "18%", "aspect-ratio": "1" }}>
        <div
          class="absolute rounded-full"
          style={{
            inset: "-40%",
            background:
              "radial-gradient(circle, rgba(230,235,255,0.25) 0%, transparent 60%)",
          }}
        />
        <div
          class="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, #F5F1E8 0%, #D8D0BC 60%, #998E76 100%)",
            "box-shadow":
              "0 0 20px rgba(255,250,230,0.3), inset -8px -6px 16px rgba(0,0,0,0.4)",
          }}
        />
        <div
          class="absolute inset-0 rounded-full"
          style={{
            background:
              "radial-gradient(circle at 75% 50%, transparent 45%, oklch(0.12 0.04 270) 55%)",
          }}
        />
      </div>

      <div
        class="absolute h-px w-24"
        style={{
          top: "18%",
          right: "-20%",
          background:
            "linear-gradient(90deg, white 0%, rgba(255,255,255,0.9) 30%, transparent 100%)",
          filter: "drop-shadow(0 0 4px white)",
          transform: "rotate(-18deg)",
          animation: "shooting-star 22s ease-out infinite",
          "will-change": "transform",
        }}
      />

      <style>{`
        @keyframes star-twinkle-far  { 0%,100% { opacity: 0.45; } 50% { opacity: 0.85; } }
        @keyframes star-twinkle-mid  { 0%,100% { opacity: 0.7; transform: scale(1);   } 50% { opacity: 1; transform: scale(1.4); } }
        @keyframes star-twinkle-near { 0%,100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.6); } }
        @keyframes shooting-star {
          0%, 88% { transform: translate(0, 0) rotate(-18deg); opacity: 0; }
          90%     { opacity: 1; }
          100%    { transform: translate(-180%, 60%) rotate(-18deg); opacity: 0; }
        }
        .star-flare {
          position: absolute;
          width: 3px; height: 3px;
          background: white;
          border-radius: 50%;
          box-shadow: 0 0 8px white;
        }
        .star-flare::before, .star-flare::after {
          content: "";
          position: absolute;
          left: 50%; top: 50%;
          background: linear-gradient(90deg, transparent, white, transparent);
          transform: translate(-50%, -50%);
        }
        .star-flare::before { width: 14px; height: 1px; }
        .star-flare::after  { width: 1px;  height: 14px; }
      `}</style>
    </>
  );
}
