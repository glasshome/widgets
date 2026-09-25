import { Button, Icon, PanelFacts, PanelSection, WidgetPanel } from "@glasshome/widget-sdk";
import { Show } from "solid-js";
import type { Slide } from "./slideshow";
import type { ChangeInterval, PictureFit } from "./types";

const EVERY: Record<ChangeInterval, string> = {
  off: "On swipe",
  "10s": "10 sec",
  "30s": "30 sec",
  "1m": "1 min",
  "5m": "5 min",
};

const FIT: Record<PictureFit, string> = {
  cover: "Fill",
  contain: "Whole",
};

/** The frame, held: the picture on show edge to edge, and a step back or forward. */
export function PictureFramePanel(props: {
  slide: Slide | undefined;
  position: number;
  count: number;
  samples: boolean;
  fit: PictureFit;
  interval: ChangeInterval;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const several = () => props.count > 1;
  return (
    <WidgetPanel
      icon="mdi:image-frame"
      eyebrow={several() ? `${props.position + 1} of ${props.count}` : undefined}
      name={props.samples ? "Sample photos" : "Picture frame"}
      backdrop={
        <Show when={props.slide}>
          {(slide) => (
            <>
              <Show when={props.fit === "contain"}>
                <img
                  src={slide().src}
                  alt=""
                  style={{ filter: "blur(20px) saturate(1.3) brightness(0.85)", scale: "1.2" }}
                />
              </Show>
              <img src={slide().src} alt="" style={{ "object-fit": props.fit }} />
            </>
          )}
        </Show>
      }
      actions={
        <Show when={several()}>
          <Button variant="outline" onClick={() => props.onPrevious()}>
            <Icon icon="mdi:chevron-left" width={18} />
            Previous
          </Button>
          <Button variant="outline" onClick={() => props.onNext()}>
            Next
            <Icon icon="mdi:chevron-right" width={18} />
          </Button>
        </Show>
      }
    >
      <PanelSection label="Slideshow">
        <PanelFacts
          items={[
            {
              icon: "mdi:image-multiple-outline",
              label: props.samples ? "Samples" : "Pictures",
              value: String(props.count),
            },
            { icon: "mdi:timer-outline", label: "Changes", value: EVERY[props.interval] },
            { icon: "mdi:crop-free", label: "Fit", value: FIT[props.fit] },
          ]}
        />
      </PanelSection>
    </WidgetPanel>
  );
}
