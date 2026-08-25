import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  defineWidget,
  imageUrl,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { FrameContent } from "./frame-content";
import { resolveSlideshow } from "./slideshow";
import { configSchema, type PictureFrameConfig } from "./types";

function PictureFrameWidget(props: { config: PictureFrameConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const sources = createMemo(() =>
    props.config.pictures.map((p) => ({ src: imageUrl(p.image), caption: p.caption })),
  );

  const [failed, setFailed] = createSignal<ReadonlySet<string>>(new Set());
  const chosenIds = createMemo(() => props.config.pictures.map((p) => p.image ?? "").join("|"));
  createEffect(() => {
    chosenIds();
    setFailed(new Set<string>());
  });

  const view = createMemo(() =>
    resolveSlideshow({
      pictures: sources(),
      fit: props.config.fit,
      interval: props.config.interval,
      failed: failed(),
    }),
  );

  const slideshow = createMemo(() => {
    const v = view();
    return v.kind === "slideshow" ? v : undefined;
  });

  const [api, setApi] = createSignal<CarouselApi>();
  createEffect(() => {
    const count = slideshow()?.slides.length ?? 0;
    if (count > 0) api()?.reInit();
  });

  const markFailed = (src: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
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
        <Show when={slideshow()}>
          {(show) => (
            <Show
              when={show().slides.length > 1}
              fallback={
                <Show when={show().slides[0]}>
                  {(slide) => (
                    <FrameContent
                      src={slide().src}
                      objectFit={show().objectFit}
                      caption={slide().caption}
                      onFailed={() => markFailed(slide().src)}
                    />
                  )}
                </Show>
              }
            >
              <div class="absolute inset-0 overflow-hidden rounded-[inherit]">
                <Carousel
                  class="h-full"
                  transition="fade"
                  autoplay={show().autoplay}
                  opts={{ loop: true }}
                  setApi={setApi}
                >
                  <CarouselContent class="h-full">
                    <For each={show().slides}>
                      {(slide) => (
                        <CarouselItem class="relative h-full">
                          <FrameContent
                            src={slide.src}
                            objectFit={show().objectFit}
                            caption={slide.caption}
                            dotsBelow
                            onFailed={() => markFailed(slide.src)}
                          />
                        </CarouselItem>
                      )}
                    </For>
                  </CarouselContent>
                  <CarouselDots class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/70 to-transparent pt-6 pb-2" />
                </Carousel>
              </div>
            </Show>
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
    description: "Show your own photos on the dashboard, one at a time",
    icon: "mdi:image-frame",
    configVersion: 1,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 8, h: 6 },
    defaultSize: { w: 2, h: 2 },
    sdkVersion: "^1.11.2",
    examples: [
      {
        label: "Family photos",
        size: { w: 3, h: 2 },
        config: { pictures: [], fit: "cover", interval: "30s" },
      },
    ],
  },
  configSchema,
  component: PictureFrameWidget,
});
