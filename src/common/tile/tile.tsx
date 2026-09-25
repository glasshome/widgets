import {
  Badge,
  Button,
  ButtonGroup,
  Icon,
  ToggleGroup,
  ToggleGroupItem,
  WidgetIcon,
} from "@glasshome/widget-sdk";
import {
  children,
  createEffect,
  createMemo,
  createSignal,
  For,
  type JSX,
  on,
  Show,
} from "solid-js";
import "./tile.css";

const INNER = "rounded-[var(--tile-radius-inner)]";
const INNER_NESTED = "rounded-[var(--tile-radius-nested)]";

export function Tile(props: {
  active?: boolean;
  backdrop?: boolean;
  accent?: string;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <div
      class={props.class ? `tile ${props.class}` : "tile"}
      style={props.accent ? { "--widget-color": props.accent } : undefined}
      data-active={props.active || undefined}
      data-backdrop={props.backdrop || undefined}
    >
      {props.children}
    </div>
  );
}

export function TileHead(props: {
  icon?: string;
  eyebrow?: JSX.Element;
  name: JSX.Element;
  aside?: JSX.Element;
  active?: boolean;
  count?: number;
}) {
  // Resolved once: reading a JSX prop twice (Show + body) rebuilds its DOM on every change.
  const eyebrow = children(() => props.eyebrow);
  const aside = children(() => props.aside);
  return (
    <div class="tile-head">
      <Show when={props.icon}>
        {(icon) => (
          <WidgetIcon
            icon={<Icon icon={icon()} />}
            entityCount={props.count}
            color={props.active ? undefined : "var(--muted-foreground)"}
            class="tile-icon"
          />
        )}
      </Show>
      <div class="tile-head-text">
        <Show when={eyebrow()}>
          <span class="tile-eyebrow">{eyebrow()}</span>
        </Show>
        <span class="tile-name">{props.name}</span>
      </div>
      <Show when={aside()}>
        <div class="tile-head-aside">{aside()}</div>
      </Show>
    </div>
  );
}

export function TileHero(props: {
  value: JSX.Element;
  unit?: string;
  sub?: JSX.Element;
  art?: JSX.Element;
  class?: string;
}) {
  const sub = children(() => props.sub);
  const art = children(() => props.art);
  // A new state ("Locked" to "Unlocked", "Off" to "80%") rises in; a reading whose digits tick does not.
  const wording = createMemo(() =>
    typeof props.value === "string" ? props.value.replace(/[\d\s.,:/%°+\-−]/g, "") : undefined,
  );
  const [turn, setTurn] = createSignal<"a" | "b" | undefined>();
  createEffect(on(wording, () => setTurn((t) => (t === "a" ? "b" : "a")), { defer: true }));
  return (
    <div class={props.class ? `tile-hero ${props.class}` : "tile-hero"}>
      <div class="tile-reading">
        <Show when={sub()}>
          <span class="tile-sub">{sub()}</span>
        </Show>
        <span class="tile-value" data-turn={turn()}>
          {props.value}
          <Show when={props.unit}>
            <span class="tile-unit" data-degree={props.unit === "°" || undefined}>
              {props.unit}
            </span>
          </Show>
        </span>
      </div>
      <Show when={art()}>
        <div class="tile-art">{art()}</div>
      </Show>
    </div>
  );
}

export function TileControls(props: { children: JSX.Element }) {
  return (
    <div class="tile-controls" on:pointerdown={(e) => e.stopPropagation()}>
      {props.children}
    </div>
  );
}

export function TileStepper(props: { label: string; onStep: (direction: -1 | 1) => void }) {
  return (
    <ButtonGroup aria-label={props.label} class="tile-stepper">
      <Button
        variant="outline"
        size="icon"
        aria-label="Lower"
        class={`tile-control ${INNER}`}
        onClick={() => props.onStep(-1)}
      >
        <Icon icon="mdi:minus" width={18} />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Raise"
        class={`tile-control ${INNER}`}
        onClick={() => props.onStep(1)}
      >
        <Icon icon="mdi:plus" width={18} />
      </Button>
    </ButtonGroup>
  );
}

export function TileChoice(props: {
  label: string;
  tone?: string;
  value: string;
  options: { value: string; icon: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <ToggleGroup
      aria-label={props.label}
      tone={props.tone}
      value={props.value}
      onChange={(v: string | null) => v && props.onChange(v)}
      class={`tile-choice ${INNER}`}
    >
      <For each={props.options}>
        {(o) => (
          <ToggleGroupItem
            value={o.value}
            aria-label={o.label}
            class={`tile-control ${INNER_NESTED}`}
            data-optional={o.value === props.value ? undefined : ""}
          >
            <Icon icon={o.icon} width={18} />
          </ToggleGroupItem>
        )}
      </For>
    </ToggleGroup>
  );
}

export function TileChip(props: { icon?: string; tone?: string; children: JSX.Element }) {
  return (
    <Badge tone={props.tone ?? "var(--muted-foreground)"} class="gap-1 tabular-nums">
      <Show when={props.icon}>{(icon) => <Icon icon={icon()} width={13} />}</Show>
      {props.children}
    </Badge>
  );
}

export function TileBackdrop(props: { children: JSX.Element }) {
  return <div class="tile-backdrop">{props.children}</div>;
}

export function TileGlyph(props: { icon: string }) {
  return (
    <div class="tile-glyph" aria-hidden="true">
      <Icon icon={props.icon} />
    </div>
  );
}

export { INNER as TILE_INNER_RADIUS };
