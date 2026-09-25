import {
  type EntityView,
  getEntityAttribute,
  Icon,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  Slider,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  useService,
} from "@glasshome/widget-sdk";
import { createEffect, createSignal, For, on, onCleanup, Show } from "solid-js";
import { calculateFeatures, calculateProgress, formatDuration } from "./utils";

const REPEAT_NEXT: Record<string, string> = { off: "all", all: "one", one: "off" };

const members = (e: EntityView) => getEntityAttribute<string[]>(e, "group_members") ?? [];
const sources = (e: EntityView) =>
  calculateFeatures(e).supportsSource ? (getEntityAttribute<string[]>(e, "source_list") ?? []) : [];
const soundModes = (e: EntityView) =>
  calculateFeatures(e).supportsSoundMode
    ? (getEntityAttribute<string[]>(e, "sound_mode_list") ?? [])
    : [];
const duration = (e: EntityView) => getEntityAttribute<number>(e, "media_duration") ?? 0;
const seekable = (e: EntityView) => calculateFeatures(e).supportsSeek && duration(e) > 0;

/** One pick among a few: a segmented row while it fits the sheet, wrapping chips past that. */
function Choices(props: {
  label: string;
  items: string[];
  value: string | undefined;
  onPick: (value: string) => void;
}) {
  const fits = () => props.items.length <= 4 && props.items.reduce((n, c) => n + c.length, 0) <= 26;
  return (
    <Show
      when={fits()}
      fallback={
        <div class="glasshome-sheet-actions">
          <For each={props.items}>
            {(c) => (
              <Toggle
                variant="outline"
                pressed={props.value === c}
                onChange={(on) => on && props.onPick(c)}
              >
                {c}
              </Toggle>
            )}
          </For>
        </div>
      }
    >
      <ToggleGroup
        aria-label={props.label}
        class="w-full"
        value={props.value ?? null}
        onChange={(v: string | null) => v && props.onPick(v)}
      >
        <For each={props.items}>{(c) => <ToggleGroupItem value={c}>{c}</ToggleGroupItem>}</For>
      </ToggleGroup>
    </Show>
  );
}

export const mediaHasExtras = (e: EntityView) => {
  const f = calculateFeatures(e);
  return (
    members(e).length > 1 ||
    sources(e).length > 0 ||
    soundModes(e).length > 0 ||
    seekable(e) ||
    f.supportsShuffle ||
    f.supportsRepeat
  );
};

/** What the media tile cannot show: the speakers it plays on, its source, sound mode, the track position. */
export function MediaPlayerSheet(props: { entity: EntityView; name: string }) {
  const { callService } = useService();
  const call = (service: string, data: Record<string, unknown> = {}) =>
    void callService("media_player", service, data, { entity_id: props.entity.id });
  const attr = <T,>(key: string) => getEntityAttribute<T>(props.entity, key);
  const features = () => calculateFeatures(props.entity);
  const repeat = () => attr<string>("repeat") ?? "off";

  const [tick, setTick] = createSignal(0);
  createEffect(
    on(
      () => props.entity.state === "playing" && seekable(props.entity),
      (running) => {
        if (!running) return;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        onCleanup(() => clearInterval(id));
      },
    ),
  );
  const [seeking, setSeeking] = createSignal<number>();
  const position = () => {
    tick();
    return seeking() ?? calculateProgress(props.entity) * duration(props.entity);
  };

  return (
    <>
      <Show when={members(props.entity).length > 1}>
        <PanelSection label="Playing on">
          <PanelRows>
            <For each={members(props.entity)}>
              {(id) => <PanelEntityRow entityId={id} within={props.name} />}
            </For>
          </PanelRows>
        </PanelSection>
      </Show>
      <Show when={seekable(props.entity)}>
        <PanelSection
          label={`${formatDuration(position())} of ${formatDuration(duration(props.entity))}`}
        >
          <Slider
            value={[position()]}
            max={duration(props.entity)}
            onChange={(v) => setSeeking(v[0])}
            onChangeEnd={(v) => {
              setSeeking(undefined);
              call("media_seek", { seek_position: v[0] });
            }}
            aria-label="Position in the track"
          />
        </PanelSection>
      </Show>
      <Show when={features().supportsShuffle || features().supportsRepeat}>
        <PanelSection label="Play order">
          <div class="glasshome-sheet-actions">
            <Show when={features().supportsShuffle}>
              <Toggle
                variant="outline"
                pressed={attr<boolean>("shuffle") === true}
                onChange={(pressed) => call("shuffle_set", { shuffle: pressed })}
              >
                <Icon icon="mdi:shuffle-variant" />
                Shuffle
              </Toggle>
            </Show>
            <Show when={features().supportsRepeat}>
              <Toggle
                variant="outline"
                pressed={repeat() !== "off"}
                onChange={() => call("repeat_set", { repeat: REPEAT_NEXT[repeat()] ?? "off" })}
              >
                <Icon icon={repeat() === "one" ? "mdi:repeat-once" : "mdi:repeat"} />
                {repeat() === "one" ? "Repeat one" : "Repeat"}
              </Toggle>
            </Show>
          </div>
        </PanelSection>
      </Show>
      <Show when={sources(props.entity).length}>
        <PanelSection label="Source">
          <Choices
            label="Source"
            items={sources(props.entity)}
            value={attr<string>("source")}
            onPick={(source) => call("select_source", { source })}
          />
        </PanelSection>
      </Show>
      <Show when={soundModes(props.entity).length}>
        <PanelSection label="Sound">
          <Choices
            label="Sound mode"
            items={soundModes(props.entity)}
            value={attr<string>("sound_mode")}
            onPick={(sound_mode) => call("select_sound_mode", { sound_mode })}
          />
        </PanelSection>
      </Show>
    </>
  );
}
