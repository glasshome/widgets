import { For, Match, Switch } from "solid-js";
import { getWeatherGradient } from "./utils";

interface WeatherBackgroundProps {
  condition: string;
}

// Pre-computed particle arrays (no Math.random in JSX)
const RAIN_DROPS = Array.from({ length: 12 }, (_, i) => ({
  left: `${8 + i * 7.5}%`,
  delay: `${(i * 0.15) % 1.2}s`,
  height: `${12 + (i % 4) * 4}px`,
  opacity: 0.3 + (i % 3) * 0.15,
}));

const SNOW_FLAKES = Array.from({ length: 10 }, (_, i) => ({
  left: `${5 + i * 10}%`,
  delay: `${(i * 0.4) % 3}s`,
  size: `${4 + (i % 3) * 2}px`,
  opacity: 0.4 + (i % 3) * 0.2,
}));

const CLOUD_SHAPES = [
  { width: "60%", top: "10%", left: "-10%", delay: "0s", duration: "20s", opacity: 0.15 },
  { width: "45%", top: "35%", left: "20%", delay: "5s", duration: "25s", opacity: 0.1 },
  { width: "50%", top: "60%", left: "-5%", delay: "10s", duration: "22s", opacity: 0.12 },
];

export function WeatherBackground(props: WeatherBackgroundProps) {
  return (
    <div
      class="absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ background: getWeatherGradient(props.condition) }}
    >
      <Switch>
        <Match
          when={
            props.condition === "rainy" ||
            props.condition === "pouring" ||
            props.condition === "lightning-rainy" ||
            props.condition === "snowy-rainy"
          }
        >
          <For each={RAIN_DROPS}>
            {(drop) => (
              <div
                class="absolute top-0 w-px animate-[rain-fall_0.8s_linear_infinite]"
                style={{
                  left: drop.left,
                  "animation-delay": drop.delay,
                  height: drop.height,
                  opacity: drop.opacity,
                  background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.6))",
                  "will-change": "transform",
                }}
              />
            )}
          </For>
        </Match>
        <Match when={props.condition === "snowy"}>
          <For each={SNOW_FLAKES}>
            {(flake) => (
              <div
                class="absolute top-0 animate-[snow-fall_3s_linear_infinite] rounded-full bg-white"
                style={{
                  left: flake.left,
                  "animation-delay": flake.delay,
                  width: flake.size,
                  height: flake.size,
                  opacity: flake.opacity,
                  "will-change": "transform",
                }}
              />
            )}
          </For>
        </Match>
        <Match
          when={
            props.condition === "cloudy" ||
            props.condition === "partlycloudy" ||
            props.condition === "fog"
          }
        >
          <For each={CLOUD_SHAPES}>
            {(cloud) => (
              <div
                class="absolute animate-[cloud-drift_linear_infinite] rounded-full bg-white"
                style={{
                  width: cloud.width,
                  height: "30%",
                  top: cloud.top,
                  left: cloud.left,
                  "animation-delay": cloud.delay,
                  "animation-duration": cloud.duration,
                  opacity: cloud.opacity,
                  filter: "blur(8px)",
                  "will-change": "transform",
                }}
              />
            )}
          </For>
        </Match>
      </Switch>

      {/* CSS keyframes */}
      <style>{`
        @keyframes rain-fall {
          from { transform: translateY(-100%); }
          to { transform: translateY(calc(100cqh + 100%)); }
        }
        @keyframes snow-fall {
          from { transform: translateY(-100%) translateX(0); }
          to { transform: translateY(calc(100cqh + 100%)) translateX(20px); }
        }
        @keyframes cloud-drift {
          from { transform: translateX(-100%); }
          to { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
