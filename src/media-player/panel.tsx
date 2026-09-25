import {
  Button,
  type EntityView,
  getEntityAttribute,
  hassMediaUrl,
  Icon,
  PanelEntityRow,
  PanelRows,
  PanelSection,
  Slider,
  Toggle,
  ToggleGroup,
  ToggleGroupItem,
  useService,
  WidgetPanel,
} from "@glasshome/widget-sdk";
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from "solid-js";
import { calculateFeatures, calculateProgress, formatDuration } from "./utils";
import { VinylRecord } from "./vinyl-record";

const REPEAT_NEXT: Record<string, string> = { off: "all", all: "one", one: "off" };

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replaceAll("_", " ");

/** The player, held: its record big, what is playing, where it plays and from what source. */
export function MediaPlayerPanel(props: { entity: EntityView; name: string }) {
  const { callService } = useService();
  const call = (service: string, data: Record<string, unknown> = {}) =>
    void callService("media_player", service, data, { entity_id: props.entity.id });
  const attr = <T,>(key: string) => getEntityAttribute<T>(props.entity, key);

  const features = createMemo(() => calculateFeatures(props.entity));
  const isPlaying = () => props.entity.state === "playing";
  const cover = () => hassMediaUrl(attr<string>("entity_picture"));

  const members = createMemo(() => {
    const list = attr<string[]>("group_members");
    return list?.length ? list : [props.entity.id];
  });
  const sources = () => attr<string[]>("source_list") ?? [];
  const soundModes = () => attr<string[]>("sound_mode_list") ?? [];
  const repeat = () => attr<string>("repeat") ?? "off";

  const serverVolume = () => {
    const v = attr<number>("volume_level");
    return v === undefined ? 0 : Math.round(v * 100);
  };
  const [dragged, setDragged] = createSignal<number>();
  const volume = () => dragged() ?? serverVolume();
  const setVolume = (value: number) => {
    setDragged(undefined);
    call("volume_set", { volume_level: value / 100 });
  };

  const duration = () => attr<number>("media_duration") ?? 0;
  const [tick, setTick] = createSignal(0);
  createEffect(
    on(
      () => isPlaying() && duration() > 0,
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
    return seeking() ?? calculateProgress(props.entity) * duration();
  };

  const eyebrow = () => {
    const parts = [
      members().length > 1 ? "Speaker group" : undefined,
      attr<string>("source"),
      isPlaying() ? undefined : titleCase(props.entity.state),
    ].filter(Boolean);
    return parts.length ? parts.join(" · ") : undefined;
  };

  const caption = () => {
    const parts = [attr<string>("media_artist")];
    if (duration() > 0)
      parts.push(`${formatDuration(position())} of ${formatDuration(duration())}`);
    const shown = parts.filter(Boolean);
    return shown.length ? shown.join(" · ") : undefined;
  };

  return (
    <WidgetPanel
      icon="mdi:music"
      tone="var(--tone-accent)"
      eyebrow={eyebrow()}
      name={props.name}
      backdrop={
        <Show when={cover()}>
          {(src) => (
            <img
              src={src()}
              alt=""
              style={{ filter: "blur(32px) saturate(1.3)", transform: "scale(1.2)" }}
            />
          )}
        </Show>
      }
      art={
        <div style={{ height: "100%", "aspect-ratio": "1" }}>
          <VinylRecord imageUrl={cover()} isPlaying={isPlaying()} />
        </div>
      }
      hint={
        features().supportsVolume ? `Drag anywhere to set the volume · ${volume()}%` : undefined
      }
      value={attr<string>("media_title") || titleCase(props.entity.state)}
      caption={caption()}
      slide={
        features().supportsVolume
          ? { value: volume(), onChange: setDragged, onCommit: setVolume }
          : undefined
      }
      actions={
        <>
          <Show when={duration() > 0}>
            <Slider
              value={[position()]}
              max={duration()}
              disabled={!features().supportsSeek}
              onChange={(v) => setSeeking(v[0])}
              onChangeEnd={(v) => {
                setSeeking(undefined);
                call("media_seek", { seek_position: v[0] });
              }}
              aria-label="Position in the track"
            />
          </Show>
          <Show when={features().supportsPrevious}>
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous track"
              onClick={() => call("media_previous_track")}
            >
              <Icon icon="mdi:skip-previous" />
            </Button>
          </Show>
          <Show when={features().supportsPlayPause}>
            <Button
              size="icon"
              aria-label={isPlaying() ? "Pause" : "Play"}
              onClick={() => call("media_play_pause")}
            >
              <Icon icon={isPlaying() ? "mdi:pause" : "mdi:play"} />
            </Button>
          </Show>
          <Show when={features().supportsNext}>
            <Button
              variant="outline"
              size="icon"
              aria-label="Next track"
              onClick={() => call("media_next_track")}
            >
              <Icon icon="mdi:skip-next" />
            </Button>
          </Show>
          <Show when={features().supportsShuffle}>
            <Toggle
              variant="outline"
              aria-label="Shuffle"
              pressed={attr<boolean>("shuffle") === true}
              onChange={(on) => call("shuffle_set", { shuffle: on })}
            >
              <Icon icon="mdi:shuffle-variant" />
            </Toggle>
          </Show>
          <Show when={features().supportsRepeat}>
            <Toggle
              variant="outline"
              aria-label={repeat() === "one" ? "Repeat one" : "Repeat"}
              pressed={repeat() !== "off"}
              onChange={() => call("repeat_set", { repeat: REPEAT_NEXT[repeat()] ?? "off" })}
            >
              <Icon icon={repeat() === "one" ? "mdi:repeat-once" : "mdi:repeat"} />
            </Toggle>
          </Show>
        </>
      }
    >
      <PanelSection label="Playing on">
        <PanelRows>
          <For each={members()}>{(id) => <PanelEntityRow entityId={id} within={props.name} />}</For>
        </PanelRows>
      </PanelSection>
      <Show when={features().supportsSource && sources().length}>
        <PanelSection label="Source">
          <ToggleGroup
            value={attr<string>("source") ?? null}
            onChange={(source) => source && call("select_source", { source })}
            aria-label="Source"
          >
            <For each={sources()}>
              {(s) => <ToggleGroupItem value={s}>{s}</ToggleGroupItem>}
            </For>
          </ToggleGroup>
        </PanelSection>
      </Show>
      <Show when={features().supportsSoundMode && soundModes().length}>
        <PanelSection label="Sound">
          <ToggleGroup
            value={attr<string>("sound_mode") ?? null}
            onChange={(mode) => mode && call("select_sound_mode", { sound_mode: mode })}
            aria-label="Sound mode"
          >
            <For each={soundModes()}>
              {(m) => <ToggleGroupItem value={m}>{m}</ToggleGroupItem>}
            </For>
          </ToggleGroup>
        </PanelSection>
      </Show>
    </WidgetPanel>
  );
}
