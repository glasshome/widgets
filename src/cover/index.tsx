import {
  Button,
  ButtonGroup,
  buildDebugData,
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
  type WidgetDebugData,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { getCoverIcon, widgetDialogProps } from "../common";
import { CoverArt, type CoverKind } from "../common/art/cover";
import { coverJoinsBulk, groupLine } from "../common/group";
import { Tile, TileControls, TileGlyph, TileHead, TileHero } from "../common/tile/tile";
import { getCoverCapabilities, getCoverPosition, isCoverOpen } from "./cover-entity";
import { CoverSheet, coverHasExtras } from "./sheet";

const configSchema = defineConfig({
  title: field.title(),
  entityIds: field.entities("cover"),
  art: field.choice(["device", "blind", "curtain", "shutter", "garage"], {
    title: "Cover picture",
    default: "device",
    labels: {
      device: "Match Home Assistant",
      blind: "Window blind",
      curtain: "Curtains",
      shutter: "Roller shutter",
      garage: "Garage door",
    },
    icons: {
      device: "mdi:home-assistant",
      blind: "mdi:blinds",
      curtain: "mdi:curtains",
      shutter: "mdi:window-shutter",
      garage: "mdi:garage",
    },
  }),
});
type CoverConfig = Infer<typeof configSchema>;

const KIND_BY_DEVICE_CLASS: Partial<Record<string, CoverKind>> = {
  curtain: "curtain",
  shutter: "shutter",
  garage: "garage",
  gate: "garage",
  door: "garage",
};

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
  const artKind = (): CoverKind => {
    const art = props.config.art;
    if (art !== "device") return art;
    return KIND_BY_DEVICE_CLASS[primary()?.deviceClass ?? ""] ?? "blind";
  };
  const heroValue = () => {
    const sliding = slidePosition();
    if (sliding !== null) return sliding;
    if (count() > 1) return isOpen() ? "Open" : "Closed";
    const pos = position();
    if (pos !== null) return pos;
    return isOpen() ? "Open" : "Closed";
  };
  const eyebrow = () => {
    if (count() > 1) return groupLine(openCount(), count(), { active: "open", rest: "closed" });
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

  const actsInBulk = () => count() <= 1 || entities().every(coverJoinsBulk);

  // One cover: cover.toggle, which also stops a moving one. A group moves together, towards closed while any is open.
  const handleTap = () => {
    if (!actsInBulk()) {
      openDialog();
      return;
    }
    const targets = entityIds();
    if (targets.length === 0) return;
    if (count() === 1) callService("cover", "toggle", {}, { entity_id: targets });
    else callService("cover", isOpen() ? "close_cover" : "open_cover", {}, { entity_id: targets });
  };

  const extras = createMemo(() => coverHasExtras(entities()));

  const gestures = useWidgetGestures(() => ({
    tap: handleTap,
    hold: extras() ? { action: openDialog } : undefined,
    slide: !actsInBulk()
      ? undefined
      : supportsPosition()
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
              art={<CoverArt kind={artKind()} closed={100 - fillValue()} />}
            />
            <Show when={actsInBulk()}>
              <TileControls>
                <ButtonGroup aria-label="Cover" class="tile-stepper">
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Open"
                    class="tile-control"
                    onClick={() =>
                      callService("cover", "open_cover", {}, { entity_id: entityIds() })
                    }
                  >
                    <Icon icon="mdi:arrow-up" width={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Stop"
                    class="tile-control"
                    onClick={() =>
                      callService("cover", "stop_cover", {}, { entity_id: entityIds() })
                    }
                  >
                    <Icon icon="mdi:stop" width={18} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Close"
                    class="tile-control"
                    onClick={() =>
                      callService("cover", "close_cover", {}, { entity_id: entityIds() })
                    }
                  >
                    <Icon icon="mdi:arrow-down" width={18} />
                  </Button>
                </ButtonGroup>
              </TileControls>
            </Show>
          </Tile>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title={name()}
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        {...(extras() ? { sheet: <CoverSheet entities={entities()} name={name()} /> } : {})}
        tile={{ icon: iconName(), tone: isOpen() ? "var(--tone-info)" : undefined }}
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
    maxSize: { w: 8, h: 8 },
    configVersion: 1,
    sdkVersion: "^1.0.0",
    examples: [
      {
        label: "Blind",
        size: { w: 2, h: 2 },
        config: { entityIds: ["cover.living_room_blinds"], title: "Living Room", art: "blind" },
      },
      {
        label: "Curtains closed",
        size: { w: 3, h: 2 },
        config: { entityIds: ["cover.bedroom_curtains"], title: "Bedroom", art: "curtain" },
      },
      {
        label: "Shutter half open",
        size: { w: 2, h: 2 },
        config: { entityIds: ["cover.living_room_shutters"], title: "Living Room", art: "shutter" },
      },
      {
        label: "Garage door",
        size: { w: 3, h: 3 },
        config: { entityIds: ["cover.garage_door"], title: "Garage", art: "garage" },
      },
      {
        label: "Blind open",
        size: { w: 3, h: 3 },
        config: { entityIds: ["cover.kitchen_blinds"], title: "Kitchen", art: "blind" },
      },
      {
        label: "Gate open",
        size: { w: 2, h: 2 },
        config: { entityIds: ["cover.driveway_gate"], title: "Driveway", art: "garage" },
      },
      {
        label: "Blinds",
        size: { w: 3, h: 2 },
        config: {
          entityIds: ["cover.living_room_blinds", "cover.bedroom_curtains"],
          title: "Blinds",
          art: "blind",
        },
      },
    ],
  },
  configSchema,
  component: CoverWidget,
});
