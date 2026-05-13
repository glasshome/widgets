import { useEntities, useService } from "@glasshome/sync-layer/solid";
import {
  defineWidget,
  getEntityAttribute,
  stateColors,
  useWidgetContext,
  useWidgetDialog,
  useWidgetEntityGroup,
  useWidgetGestures,
  Widget,
  WidgetDialog,
  widgetFields,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, onCleanup, Show } from "solid-js";
import { z } from "zod";
import type { WidgetDebugData } from "../common";
import { buildDebugData, getCoverIcon, WidgetDebugView, widgetDialogProps } from "../common";
import { CoverControls } from "./controls";

const configSchema = z.object({
  title: widgetFields.title(),
  entityIds: widgetFields.entityIds("cover"),
});
type CoverConfig = z.infer<typeof configSchema>;

function CoverWidget(props: { config: CoverConfig }) {
  const ctx = useWidgetContext();
  const { showDialog, setShowDialog, openDialog } = useWidgetDialog();

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

  const position = createMemo(() => {
    const first = entities()[0];
    if (!first) return 0;
    return getEntityAttribute<number>(first, "current_position") ?? 0;
  });

  const [slidePosition, setSlidePosition] = createSignal<number | null>(null);

  const displayPosition = createMemo(() => slidePosition() ?? position());

  const deviceClass = createMemo(() => {
    const first = entities()[0];
    if (!first) return null;
    return getEntityAttribute<string>(first, "device_class") ?? null;
  });

  const iconName = createMemo(() => getCoverIcon(displayPosition(), deviceClass()));

  const statusText = createMemo(() => {
    const first = entities()[0];
    if (!first) return "Unknown";
    const state = first.state;
    if (state === "opening") return "Opening...";
    if (state === "closing") return "Closing...";
    const pos = displayPosition();
    if (pos === 0) return "Closed";
    if (pos === 100) return "Open";
    return `${pos}%`;
  });

  const isOpen = createMemo(() => displayPosition() > 0);

  let positionDebounce: ReturnType<typeof setTimeout> | undefined;
  const handleSlideChange = (value: number) => {
    setSlidePosition(value);
    clearTimeout(positionDebounce);
    positionDebounce = setTimeout(() => {
      const first = entities()[0];
      if (!first) return;
      callService(
        "cover" as any,
        "set_cover_position" as any,
        { position: value },
        { entity_id: first.id },
      );
      setSlidePosition(null);
    }, 300);
  };

  const handleTap = () => {
    const first = entities()[0];
    if (!first) return;
    if (displayPosition() > 50) {
      callService("cover" as any, "close_cover" as any, {}, { entity_id: first.id });
    } else {
      callService("cover" as any, "open_cover" as any, {}, { entity_id: first.id });
    }
  };

  const gestures = useWidgetGestures(
    () => ({
      tap: handleTap,
      hold: { action: openDialog, delay: 300 },
      slide: {
        value: displayPosition(),
        onChange: handleSlideChange,
        min: 0,
        max: 100,
        orientation: "auto" as const,
      },
    }),
    () => ctx.orientation(),
  );
  onCleanup(() => {
    gestures.dispose();
    clearTimeout(positionDebounce);
  });

  const colors = createMemo(() => (isOpen() ? stateColors.active : stateColors.inactive));

  const debugData = createMemo<WidgetDebugData | undefined>(() => {
    const ents = entities();
    if (ents.length === 0) return undefined;
    return buildDebugData(props.config as unknown as Record<string, unknown>, ents, {
      position: displayPosition(),
    });
  });

  return (
    <>
      <Widget
        gestures={gestures}
        variant="classic-glass"
        gradient={colors().gradient}
        emptyState={emptyState()}
      >
        <Show when={hasEntities()}>
          <Widget.SliderFill
            value={displayPosition()}
            color="rgb(59, 130, 246)"
            isDragging={slidePosition() !== null}
          />
          <Widget.Content>
            <Widget.Icon
              icon={<Icon icon={iconName()} />}
              color={colors().icon}
              glow={isOpen() ? colors().glow : undefined}
              entityCount={entities().length}
            />
            <div class="flex flex-col gap-1 overflow-hidden">
              <Widget.Title>
                {props.config.title || entities()[0]?.friendlyName || "Cover"}
              </Widget.Title>
              <Widget.Status>{statusText()}</Widget.Status>
            </div>
          </Widget.Content>
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        open={showDialog()}
        onOpenChange={setShowDialog}
        title="Cover"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
        controlsContent={
          <Show when={entities()[0]}>{(entity) => <CoverControls entity={entity()} />}</Show>
        }
        debugContent={debugData() ? <WidgetDebugView data={debugData()!} /> : undefined}
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
    sdkVersion: "^0.3.0",
  },
  configSchema,
  component: CoverWidget,
});
