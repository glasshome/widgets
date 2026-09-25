import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselDots,
  CarouselItem,
  defineWidget,
  imageSrc,
  presetValue,
  useWidgetContext,
  useWidgetDialog,
  useWidgetGestures,
  Widget,
  WidgetDialog,
} from "@glasshome/widget-sdk";
import { createEffect, createMemo, createSignal, For, onCleanup, Show } from "solid-js";
import { widgetDialogProps } from "../common";
import { Tile, TileChip } from "../common/tile/tile";
import { FrameContent } from "./frame-content";
import { PictureFramePanel } from "./panel";
import { SAMPLES } from "./samples";
import { resolveSlideshow } from "./slideshow";
import { configSchema, type PictureFrameConfig } from "./types";
import "./picture-frame.css";

const SAMPLE_CONFIG: PictureFrameConfig = { pictures: [], fit: "cover", interval: "30s" };

const picked = (...names: string[]): PictureFrameConfig => ({
  ...SAMPLE_CONFIG,
  pictures: names.map((name) => ({ image: presetValue(name) })),
});

function PictureFrameWidget(props: { config: PictureFrameConfig }) {
  const ctx = useWidgetContext();
  const { setShowDialog, openDialog, dialogProps } = useWidgetDialog();

  const sources = createMemo(() =>
    props.config.pictures.map((p) => ({ src: imageSrc(p.image, SAMPLES) })),
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
      samples: Object.values(SAMPLES).map((sample) => sample.src),
      fit: props.config.fit,
      interval: props.config.interval,
      failed: failed(),
    }),
  );

  const [api, setApi] = createSignal<CarouselApi>();
  createEffect(() => {
    const count = view().slides.length;
    if (count > 0) api()?.reInit();
  });

  const [position, setPosition] = createSignal(0);
  createEffect(() => {
    const carousel = api();
    if (!carousel) return;
    const sync = () => setPosition(carousel.selectedScrollSnap());
    sync();
    carousel.on("select", sync);
    carousel.on("reInit", sync);
    onCleanup(() => {
      carousel.off("select", sync);
      carousel.off("reInit", sync);
    });
  });
  const shownAt = () => Math.min(position(), Math.max(0, view().slides.length - 1));

  const markFailed = (src: string) =>
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(src);
      return next;
    });

  const gestures = useWidgetGestures(() => ({ hold: { action: openDialog } }));
  onCleanup(gestures.dispose);

  return (
    <>
      <Widget gestures={gestures} variant="classic-glass">
        <Tile>
          <div class="frame-layer">
            <Show
              when={view().slides.length > 1}
              fallback={
                <Show when={view().slides[0]}>
                  {(slide) => (
                    <FrameContent
                      src={slide().src}
                      objectFit={view().objectFit}
                      onFailed={() => markFailed(slide().src)}
                    />
                  )}
                </Show>
              }
            >
              <Carousel
                class="h-full"
                transition="fade"
                autoplay={view().autoplay}
                opts={{ loop: true }}
                setApi={setApi}
              >
                <CarouselContent class="h-full">
                  <For each={view().slides}>
                    {(slide) => (
                      <CarouselItem class="relative h-full">
                        <FrameContent
                          src={slide.src}
                          objectFit={view().objectFit}
                          onFailed={() => markFailed(slide.src)}
                        />
                      </CarouselItem>
                    )}
                  </For>
                </CarouselContent>
                <CarouselDots class="frame-dots absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/70 to-transparent pt-6 pb-2" />
              </Carousel>
            </Show>
          </div>
          <Show when={view().note}>
            {(note) => (
              <div class="frame-note">
                <TileChip icon="mdi:image-multiple-outline">
                  {note().label}
                  <span class="frame-note-hint"> · {note().hint}</span>
                </TileChip>
              </div>
            )}
          </Show>
        </Tile>
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
        panel={
          <PictureFramePanel
            slide={view().slides[shownAt()]}
            position={shownAt()}
            count={view().slides.length}
            samples={view().note !== undefined}
            fit={view().objectFit}
            interval={props.config.interval ?? "30s"}
            onPrevious={() => api()?.scrollPrev()}
            onNext={() => api()?.scrollNext()}
          />
        }
      />
    </>
  );
}

export default defineWidget<PictureFrameConfig>({
  manifest: {
    name: "Picture Frame",
    description: "Your own photos on the dashboard, one at a time or as a slideshow",
    icon: "mdi:image-frame",
    configVersion: 2,
    minSize: { w: 1, h: 1 },
    maxSize: { w: 12, h: 12 },
    defaultSize: { w: 2, h: 2 },
    sdkVersion: "^1.11.2",
    examples: [
      { label: "Sample photos", size: { w: 2, h: 2 }, config: SAMPLE_CONFIG },
      { label: "Your photo", size: { w: 3, h: 3 }, config: picked("dog") },
      { label: "Wide", size: { w: 4, h: 2 }, config: picked("coast", "meadow") },
      {
        label: "Portrait, whole picture",
        size: { w: 3, h: 3 },
        config: { ...picked("forest"), fit: "contain" },
      },
      { label: "Tall", size: { w: 2, h: 4 }, config: picked("forest") },
      { label: "Large", size: { w: 4, h: 4 }, config: picked("meadow", "dog") },
      { label: "Small", size: { w: 1, h: 1 }, config: picked("dog") },
    ],
  },
  configSchema,
  component: PictureFrameWidget,
});
