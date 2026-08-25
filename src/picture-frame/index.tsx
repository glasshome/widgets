import {
  defineWidget,
  imageUrl,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { FrameContent } from "./frame-content";
import { resolvePicture } from "./picture";
import { configSchema, type PictureFrameConfig } from "./types";

function PictureFrameWidget(props: { config: PictureFrameConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const src = createMemo(() => imageUrl(props.config.image));

  const [failed, setFailed] = createSignal(false);
  createEffect(() => {
    src();
    setFailed(false);
  });

  const view = createMemo(() =>
    resolvePicture({ src: src(), fit: props.config.fit, failed: failed() }),
  );

  const picture = createMemo(() => {
    const v = view();
    return v.kind === "picture" ? v : undefined;
  });

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  const emptyState = createMemo(() => {
    const v = view();
    if (v.kind !== "empty") return undefined;
    return {
      icon: <Icon icon="mdi:image-outline" width={32} />,
      title: v.title,
      message: v.message,
    };
  });

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass" emptyState={emptyState()}>
        <Show when={picture()}>
          {(p) => (
            <FrameContent
              src={p().src}
              objectFit={p().objectFit}
              caption={props.config.caption}
              onFailed={() => setFailed(true)}
            />
          )}
        </Show>
      </Widget>
      <WidgetDialog
        {...widgetDialogProps}
        {...dialogProps}
        title="Picture Frame"
        maxWidth="lg"
        configSchema={configSchema}
        config={props.config}
        onConfigSave={(config) => {
          ctx.updateConfig(config);
          setShowDialog(false);
        }}
      />
    </>
  );
}

export default defineWidget<PictureFrameConfig>({
  manifest: {
    name: "Picture Frame",
    description: "Show one of your own photos on the dashboard",
    icon: "mdi:image-frame",
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 6 },
    defaultSize: { w: 2, h: 2 },
    sdkVersion: "^1.11.2",
    examples: [
      {
        label: "Family photo",
        size: { w: 3, h: 2 },
        config: { fit: "cover", caption: "Summer at the lake" },
      },
    ],
  },
  configSchema,
  component: PictureFrameWidget,
});
