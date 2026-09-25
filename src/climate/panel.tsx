import {
  type EntityView,
  isDark,
  type PanelFact,
  PanelFacts,
  PanelSection,
  ToggleGroup,
  ToggleGroupItem,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, For, Show } from "solid-js";
import { formatTemperature, shiftBand, type useSetpoints } from "../common";
import { FAN_MODES, getHvacModeIcon, getModeColors, HVAC_MODES } from "./utils";

const ACTION_WORD: Record<string, string> = {
  heating: "Heating",
  cooling: "Cooling",
  drying: "Drying",
  fan: "Fan running",
  preheating: "Preheating",
  defrosting: "Defrosting",
  idle: "Idle",
  off: "Off",
};

const words = (raw: string) => {
  const s = raw.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const degrees = (t: number) => (Number.isInteger(t) ? `${t}` : t.toFixed(1));

/** The thermostat, held: its device big and glowing while it runs, a drag sets the target. */
export function ClimatePanel(props: {
  entity: EntityView;
  name: string;
  art: string;
  setpoints: ReturnType<typeof useSetpoints>;
  min: number;
  max: number;
  step: number;
  unit: string;
}) {
  const { callService } = useService();
  const attr = <T,>(key: string) => props.entity.attributes[key] as T | undefined;
  const call = (service: string, data: Record<string, unknown>) =>
    void callService("climate", service, data, { entity_id: props.entity.id });

  const hvacMode = () => props.entity.state;
  const off = () => hvacMode() === "off";
  const tone = createMemo(() => getModeColors(hvacMode(), isDark()).color);
  const action = () => attr<string>("hvac_action");
  const running = () => {
    const a = action();
    return !!a && a !== "idle" && a !== "off";
  };
  const currentTemp = () => attr<number>("current_temperature");
  const humidity = () => attr<number>("current_humidity");

  const targets = () => props.setpoints.values();
  const isRange = () => targets().length === 2;
  const mid = () => {
    const v = targets();
    return v.length === 0 ? undefined : (Math.min(...v) + Math.max(...v)) / 2;
  };

  // The stage slide rounds to whole numbers, so it counts steps rather than degrees.
  const toSteps = (t: number) => (t - props.min) / props.step;
  const fromSteps = (n: number) => props.min + n * props.step;
  const bandAt = (n: number) => {
    const m = mid();
    if (m === undefined) return targets();
    const delta = Math.round((fromSteps(n) - m) / props.step) * props.step;
    return shiftBand(targets(), delta, props.min, props.max);
  };
  const slide = () => {
    const m = mid();
    if (off() || m === undefined) return undefined;
    return {
      value: toSteps(m),
      min: 0,
      max: Math.round((props.max - props.min) / props.step),
      onChange: (n: number) => props.setpoints.setPending(bandAt(n)),
      onCommit: (n: number) => props.setpoints.commitValues(bandAt(n)),
    };
  };

  const eyebrow = () => {
    const parts: string[] = [];
    const t = currentTemp();
    if (t !== undefined) parts.push(`Now ${formatTemperature(t, props.unit)}`);
    const h = humidity();
    if (h !== undefined) parts.push(`${Math.round(h)}%`);
    return parts.length ? parts.join(" · ") : undefined;
  };

  const caption = () => {
    if (off()) return undefined;
    const [lo, hi] = targets();
    if (lo === undefined) return HVAC_MODES[hvacMode()]?.label ?? words(hvacMode());
    if (hi !== undefined) return `Heats below ${degrees(lo)}° · cools above ${degrees(hi)}°`;
    const a = action();
    if (running() && a) return `${ACTION_WORD[a] ?? words(a)} to ${degrees(lo)}°`;
    return `${HVAC_MODES[hvacMode()]?.label ?? words(hvacMode())} to ${degrees(lo)}°`;
  };

  const value = () => {
    if (off()) return "Off";
    const [lo, hi] = targets();
    if (lo === undefined) return undefined;
    if (hi === undefined)
      return (
        <>
          {degrees(lo)}
          <small>°</small>
        </>
      );
    return (
      <>
        {degrees(lo)}
        <small>°{"\u00a0·\u00a0"}</small>
        {degrees(hi)}
        <small>°</small>
      </>
    );
  };

  const hvacModes = () => attr<string[]>("hvac_modes") ?? [];
  const presets = () => attr<string[]>("preset_modes") ?? [];
  const fanModes = () => attr<string[]>("fan_modes") ?? [];

  const facts = createMemo((): PanelFact[] => {
    const out: PanelFact[] = [];
    const t = currentTemp();
    if (t !== undefined)
      out.push({ icon: "mdi:thermometer", label: "Now", value: formatTemperature(t, props.unit) });
    const h = humidity();
    if (h !== undefined)
      out.push({ icon: "mdi:water-percent", label: "Humidity", value: `${Math.round(h)}%` });
    const a = action();
    if (a)
      out.push({
        icon: getHvacModeIcon(hvacMode()),
        label: "Status",
        value: ACTION_WORD[a] ?? words(a),
      });
    return out;
  });

  return (
    <WidgetPanel
      icon={getHvacModeIcon(hvacMode())}
      tone={tone()}
      eyebrow={eyebrow()}
      name={props.name}
      art={
        <img
          src={props.art}
          alt=""
          style={{
            filter: off()
              ? "brightness(0.7) saturate(0.85)"
              : running()
                ? "drop-shadow(0 0 28px color-mix(in oklch, var(--widget-color) 60%, transparent))"
                : "none",
            transition: "filter 400ms ease",
          }}
        />
      }
      hint={
        slide()
          ? isRange()
            ? "Drag anywhere to move both"
            : "Drag anywhere to set the target"
          : undefined
      }
      value={value()}
      caption={caption()}
      slide={slide()}
      actions={
        <Show when={hvacModes().length > 1}>
          <ToggleGroup
            aria-label="Mode"
            tone={tone()}
            value={hvacMode()}
            onChange={(m: string | null) => m && call("set_hvac_mode", { hvac_mode: m })}
          >
            <For each={hvacModes()}>
              {(m) => (
                <ToggleGroupItem value={m} aria-label={HVAC_MODES[m]?.label ?? words(m)}>
                  <Icon icon={getHvacModeIcon(m)} width={18} />
                  {HVAC_MODES[m]?.label ?? words(m)}
                </ToggleGroupItem>
              )}
            </For>
          </ToggleGroup>
        </Show>
      }
    >
      <Show when={presets().length}>
        <PanelSection label="Preset">
          <ToggleGroup
            aria-label="Preset"
            class="w-full"
            tone={tone()}
            value={attr<string>("preset_mode") ?? null}
            onChange={(p: string | null) => p && call("set_preset_mode", { preset_mode: p })}
          >
            <For each={presets()}>{(p) => <ToggleGroupItem value={p}>{words(p)}</ToggleGroupItem>}</For>
          </ToggleGroup>
        </PanelSection>
      </Show>
      <Show when={fanModes().length}>
        <PanelSection label="Fan">
          <ToggleGroup
            aria-label="Fan"
            class="w-full"
            tone={tone()}
            value={attr<string>("fan_mode") ?? null}
            onChange={(f: string | null) => f && call("set_fan_mode", { fan_mode: f })}
          >
            <For each={fanModes()}>
              {(f) => (
                <ToggleGroupItem value={f} aria-label={FAN_MODES[f]?.label ?? words(f)}>
                  <Icon icon={FAN_MODES[f]?.icon ?? "mdi:fan"} width={18} />
                  {FAN_MODES[f]?.label ?? words(f)}
                </ToggleGroupItem>
              )}
            </For>
          </ToggleGroup>
        </PanelSection>
      </Show>
      <Show when={facts().length}>
        <PanelSection label="Readings">
          <PanelFacts items={facts()} />
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
