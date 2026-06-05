import { For, Index, Show } from "solid-js";
import { energyColors } from "../_energy-shared";
import {
  beamWidth,
  chevronPoints,
  dotDuration,
  dotSchedule,
  type NodeId,
  NODE_POSITIONS,
  refractedBeamPath,
} from "./layout";

export interface BeamSpec {
  id: string;
  source: NodeId;
  /** Direction the energy travels (source → home, or home → grid for export). */
  reversed: boolean;
  watts: number;
  color: string;
}

interface BeamsProps {
  beams: BeamSpec[];
  maxWatts: number;
  /** Hide traveling dots (reduced motion, off-screen, or hidden tab). */
  motionPaused: boolean;
}

const HOME = NODE_POSITIONS.home;

function Beam(props: { spec: BeamSpec; maxWatts: number; motionPaused: boolean }) {
  // Geometry always runs from the source position to home; `reversed` only
  // flips the visual travel direction (chevrons + dot motion), not the path.
  const node = () => NODE_POSITIONS[props.spec.source];
  const path = () => refractedBeamPath(node(), HOME);
  const width = () => beamWidth(props.spec.watts, props.maxWatts);
  const dur = () => dotDuration(props.spec.watts, props.maxWatts);
  const begins = () => dotSchedule(props.spec.watts, dur());

  // Chevrons point in the travel direction. For a non-reversed beam that is
  // source → home; reversed flips the from/to so arrows point home → source.
  const arrowFrom = () => (props.spec.reversed ? HOME : node());
  const arrowTo = () => (props.spec.reversed ? node() : HOME);

  const gradId = () => `ef-beam-${props.spec.id}`;
  const from = () => energyColors[props.spec.source === "ev" ? "battery" : props.spec.source];
  const to = () => energyColors.home;

  return (
    <g>
      <defs>
        <linearGradient
          id={gradId()}
          x1={`${node().x}`}
          y1={`${node().y}`}
          x2={`${HOME.x}`}
          y2={`${HOME.y}`}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stop-color={from()} />
          <stop offset="100%" stop-color={to()} />
        </linearGradient>
      </defs>

      <path
        d={path()}
        fill="none"
        stroke={`url(#${gradId()})`}
        stroke-width={width()}
        stroke-linecap="round"
        stroke-linejoin="round"
        opacity={props.spec.watts > 0 ? 0.35 : 0.18}
        stroke-dasharray={props.spec.watts > 0 ? undefined : "0.5 3"}
      />

      {/* Static direction chevrons — informative without motion. */}
      <Index each={[0.32, 0.68]}>
        {(t) => (
          <polyline
            points={chevronPoints(arrowFrom(), arrowTo(), t())}
            fill="none"
            stroke={to()}
            stroke-width="0.9"
            stroke-linecap="round"
            stroke-linejoin="round"
            opacity="0.7"
          />
        )}
      </Index>

      {/* Traveling dots (SMIL). Conditionally rendered so paused = none. */}
      <Show when={!props.motionPaused && props.spec.watts > 0}>
        <For each={begins()}>
          {(begin) => (
            <circle r={width() * 0.45 + 0.6} fill={to()} opacity="0.95">
              <animateMotion
                dur={`${dur()}s`}
                begin={`${begin}s`}
                repeatCount="indefinite"
                keyPoints={props.spec.reversed ? "1;0" : "0;1"}
                keyTimes="0;1"
                calcMode="linear"
                path={path()}
              />
            </circle>
          )}
        </For>
      </Show>
    </g>
  );
}

export function Beams(props: BeamsProps) {
  return (
    <For each={props.beams}>
      {(spec) => <Beam spec={spec} maxWatts={props.maxWatts} motionPaused={props.motionPaused} />}
    </For>
  );
}
