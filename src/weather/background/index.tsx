import { Match, Switch } from "solid-js";
import { ClearNightScene } from "./scenes/clear-night";
import { CloudyScene } from "./scenes/cloudy";
import { ExceptionalScene } from "./scenes/exceptional";
import { FogScene } from "./scenes/fog";
import { HailScene } from "./scenes/hail";
import { LightningScene } from "./scenes/lightning";
import { RainyScene } from "./scenes/rainy";
import { SnowyScene } from "./scenes/snowy";
import { SunnyScene } from "./scenes/sunny";
import { WindyScene } from "./scenes/windy";

interface WeatherBackgroundProps {
  condition: string;
}

/**
 * Animated weather background. Picks one self-contained scene component per
 * Home Assistant condition string. Each scene owns its keyframes and inline
 * animation strings, so dropping one in or out doesn't touch the others.
 */
export function WeatherBackground(props: WeatherBackgroundProps) {
  return (
    <div
      class="absolute inset-0 overflow-hidden rounded-[inherit]"
      style={{ "container-type": "size" }}
    >
      <Switch fallback={<CloudyScene />}>
        <Match when={props.condition === "sunny"}>
          <SunnyScene />
        </Match>
        <Match when={props.condition === "clear-night"}>
          <ClearNightScene />
        </Match>
        <Match when={props.condition === "rainy"}>
          <RainyScene intensity="rainy" />
        </Match>
        <Match when={props.condition === "pouring"}>
          <RainyScene intensity="pouring" />
        </Match>
        <Match when={props.condition === "snowy"}>
          <SnowyScene />
        </Match>
        <Match when={props.condition === "snowy-rainy"}>
          <SnowyScene mixed />
        </Match>
        <Match when={props.condition === "lightning"}>
          <LightningScene />
        </Match>
        <Match when={props.condition === "lightning-rainy"}>
          <LightningScene withRain />
        </Match>
        <Match when={props.condition === "fog"}>
          <FogScene />
        </Match>
        <Match when={props.condition === "cloudy"}>
          <CloudyScene />
        </Match>
        <Match when={props.condition === "partlycloudy"}>
          <CloudyScene partlyCloudy />
        </Match>
        <Match when={props.condition === "windy" || props.condition === "windy-variant"}>
          <WindyScene />
        </Match>
        <Match when={props.condition === "hail"}>
          <HailScene />
        </Match>
        <Match when={props.condition === "exceptional"}>
          <ExceptionalScene />
        </Match>
      </Switch>
    </div>
  );
}
