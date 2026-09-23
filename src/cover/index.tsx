import {
  Button,
  ButtonGroup,
  defineConfig,
  defineWidget,
  field,
  type Infer,
  useEntities,
  useService,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  buildDebugData,
  type WidgetDebugData,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Index, onCleanup, Show } from "solid-js";
import { getCoverIcon, widgetDialogProps } from "../common";
import {
  TILE_INNER_RADIUS,
  Tile,
  TileControls,
  TileGlyph,
  TileHead,
  TileHero,
} from "../common/tile/tile";
import { CoverControls } from "./controls";
import { CoverArt } from "./cover-art";
import { getCoverCapabilities, getCoverPosition, isCoverOpen } from "./cover-entity";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("cover"),
});
type CoverConfig = Infer<typeof configSchema>;

// Minimum slide travel (in slide units, range 200 across the widget) before
// a directional slide commits to open/close.
const DIRECTIONAL_SLIDE_THRESHOLD = 20;

function CoverWidget(props: { config: CoverConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const entities = useEntities(() => props.config.entityIds);
  const { callService } = useService();

  const { emptyState, hasEntities, count } = useWidgetEntityGroup({
    entities,
    aggregationMode: () => "none",
    emptyStateConfig: {
      icon: <Icon icon="mdi:window-shutter" width={32} />,
      title: "No cover entity",
      message: "Hold to configure",
    },
  });

  const primary = createMemo(() => entities()[0]);
  const entityIds = () => entities().map((e) => e.id);

  const position = createMemo(() => getCoverPosition(primary()));
  const supportsPosition = createMemo(() => {
    const first = primary();
    return !!first && getCoverCapabilities(first).canSetPosition && position() !== null;
  });

  const [slidePosition, setSlidePosition] = createSignal<number | null>(null);
  const [slideDelta, setSlideDelta] = createSignal(0);

  const displayPosition = createMemo(() => slidePosition() ?? position());

  const isOpen = createMemo(() => entities().some(isCoverOpen));
  const openCount = createMemo(() => entities().filter(isCoverOpen).length);

  const fillValue = createMemo(() => displayPosition() ?? (isOpen() ? 100 : 0));

  const iconName = createMemo(() => getCoverIcon(isOpen(), primary()?.deviceClass ?? null));

  const name = () =>
    props.config.title ||
    entities()
      .map((e) => e.friendlyName)
      .join(", ") ||
    "Cover";
  const isWindowCover = () => !["garage", "gate", "door"].includes(primary()?.deviceClass ?? "");
  const heroValue = () => {
    const sliding = slidePosition();
    if (sliding !== null) return sliding;
    if (count() > 1) return `${openCount()}/${count()}`;
    const pos = position();
    if (pos !== null) return pos;
    return isOpen() ? "Open" : "Closed";
  };
  const eyebrow = () => {
    if (count() > 1) return "Open";
    const pos = position();
    if (pos === null) return undefined;
    return pos === 0 ? "Closed" : pos === 100 ? "Open" : "Partly open";
  };

  let slideDebounce: ReturnType<typeof setTimeout> | undefined;

  const handlePositionSlide = (value: number) => {
    setSlidePosition(value);
    clearTimeout(slideDebounce);
    slideDebounce = setTimeout(() => {
      const targets = entities()
        .filter((e) => getCoverCapabilities(e).canSetPosition)
        .map((e) => e.id);
      if (targets.length > 0) {
        callService("cover", "set_cover_position", { position: value }, { entity_id: targets });
      }
      setSlidePosition(null);
    }, 300);
  };

  const handleDirectionalSlide = (delta: number) => {
    setSlideDelta(delta);
    clearTimeout(slideDebounce);
    slideDebounce = setTimeout(() => {
      const targets = entityIds();
      if (Math.abs(delta) >= DIRECTIONAL_SLIDE_THRESHOLD && targets.length > 0) {
        callService("cover", delta > 0 ? "open_cover" : "close_cover", {}, { entity_id: targets });
      }
      setSlideDelta(0);
    }, 250);
  };

  // cover.toggle: HA picks per entity — closed opens, open/partial closes,
  // moving with stop support stops.
  const handleTap = () => {
    const targets = entityIds();
    if (targets.length === 0) return;
    callService("cover", "toggle", {}, { entity_id: targets });
  };

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    hold: { action: openDialog },
    slide: supportsPosition()
      ? {
          value: displayPosition() ?? 0,
          onChange: handlePositionSlide,
          min: 0,
          max: 100,
          orientation: "auto" as const,
        }
      : {
          value: slideDelta(),
          onChange: handleDirectionalSlide,
          min: -100,
          max: 100,
          orientation: "auto" as const,
        },
  }));
  onCleanup(() => {
    gestures.dispose();
    clearTimeout(slideDebounce);
  });

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      position: position(),
      capabilities: getCoverCapabilities(primary()),
      supportsPosition: supportsPosition(),
    });
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        tone={isOpen() ? "info" : "neutral"}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.SliderFill value={fillValue()} isDragging={slidePosition() !== null} />
          <Tile active={isOpen()}>
            <TileGlyph icon={iconName()} />
            <TileHead
              icon={iconName()}
              eyebrow={eyebrow()}
              name={name()}
              active={isOpen()}
              count={entities().length}
            />
            <TileHero
              value={heroValue()}
              unit={supportsPosition() && count() === 1 ? "%" : undefined}
              art={isWindowCover() ? <CoverArt closed={100 - fillValue()} /> : undefined}
            />
            <TileControls>
              <ButtonGroup aria-label="Cover" class="tile-stepper">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Open"
                  class={`tile-control ${TILE_INNER_RADIUS}`}
                  onClick={() => callService("cover", "open_cover", {}, { entity_id: entityIds() })}
                >
                  <Icon icon="mdi:arrow-up" width={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Stop"
                  class={`tile-control ${TILE_INNER_RADIUS}`}
                  onClick={() => callService("cover", "stop_cover", {}, { entity_id: entityIds() })}
                >
                  <Icon icon="mdi:stop" width={18} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Close"
                  class={`tile-control ${TILE_INNER_RADIUS}`}
                  onClick={() =>
                    callService("cover", "close_cover", {}, { entity_id: entityIds() })
                  }
                >
                  <Icon icon="mdi:arrow-down" width={18} />
                </Button>
              </ButtonGroup>
            </TileControls>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Cover"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={
          <Show when={hasEntities()}>
            <div class="flex flex-col gap-6">
              <Index each={entities()}>
                {(entity) => <CoverControls entity={entity()} showName={entities().length > 1} />}
              </Index>
            </div>
          </Show>
        }
        debugData={debugData()}
      />
    </>
  );
}

export default defineWidget<CoverConfig>({
  manifest: {
    name: "Cover",
    description: "Control covers, blinds, and shutters",
    icon: "mdi:window-shutter",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 4, h: 4 },
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Blinds",
        size: { w: 3, h: 2 },
        config: {
          entityIds: ["cover.living_room_blinds", "cover.bedroom_curtains"],
          title: "Blinds",
        },
      },
    ],
  },
  configSchema,
  component: CoverWidget,
});
