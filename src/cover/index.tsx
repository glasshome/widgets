import { useEntities, useService } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, Index, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, getCoverIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { CoverControls } from "./controls";
import {
  getCoverCapabilities,
  getCoverPosition,
  getCoverStatusText,
  isCoverOpen,
} from "./cover-entity";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("cover"),
});
type CoverConfig = z.infer<typeof configSchema>;

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

  const statusText = createMemo(() => {
    const sliding = slidePosition();
    if (sliding !== null) return `${sliding}%`;
    if (count() > 1) return `${openCount()}/${count()} open`;
    return getCoverStatusText(primary(), position());
  });

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
          <Widget.Content>
            <Widget.Icon icon={<Icon icon={iconName()} />} entityCount={entities().length} />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title ||
                  entities()
                    .map((e) => e.friendlyName)
                    .join(", ") ||
                  "Cover"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
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
        debugContent={<Show when={debugData()}>{(data) => <WidgetDebugView data={data()} />}</Show>}
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
    sdkVersion: "^0.5.0",
  },
  configSchema,
  component: CoverWidget,
});
