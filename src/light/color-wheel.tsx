import { createEffect, createSignal, onCleanup, onMount } from "solid-js";

interface ColorWheelProps {
  /** Current [hue, saturation] – hue 0-360, saturation 0-100 */
  value: [number, number] | null;
  /** Fires while dragging */
  onChange: (hs: [number, number]) => void;
  /** Fires on pointer-up (commit) */
  onChangeEnd?: (hs: [number, number]) => void;
  /** Max diameter in CSS px – wheel scales down to fit container */
  maxSize?: number;
}

export function ColorWheel(props: ColorWheelProps) {
  const maxSize = () => props.maxSize ?? 300;
  const [measuredWidth, setMeasuredWidth] = createSignal(0);
  // Size = min(container width, maxSize), clamped to a reasonable minimum
  const size = () => Math.max(140, Math.min(measuredWidth(), maxSize()));
  const radius = () => size() / 2;
  const padding = 0;
  const innerRadius = () => radius();

  let canvasRef!: HTMLCanvasElement;
  let containerRef!: HTMLDivElement;
  const [isDragging, setIsDragging] = createSignal(false);

  // ----- Canvas rendering -----
  function drawWheel() {
    const canvas = canvasRef;
    const dpr = window.devicePixelRatio || 1;
    const s = size();
    canvas.width = s * dpr;
    canvas.height = s * dpr;
    canvas.style.width = `${s}px`;
    canvas.style.height = `${s}px`;

    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const cx = s / 2;
    const cy = s / 2;
    const r = innerRadius();

    // Draw the wheel pixel-by-pixel via ImageData for smooth gradients
    const imageData = ctx.createImageData(s * dpr, s * dpr);
    const data = imageData.data;

    for (let py = 0; py < s * dpr; py++) {
      for (let px = 0; px < s * dpr; px++) {
        const x = px / dpr - cx;
        const y = py / dpr - cy;
        const dist = Math.sqrt(x * x + y * y);

        if (dist <= r) {
          // Hue from angle (0-360), Saturation from distance (0-100)
          let hue = (Math.atan2(y, x) * 180) / Math.PI;
          if (hue < 0) hue += 360;
          const sat = (dist / r) * 100;

          const [rr, gg, bb] = hslToRgb(hue, sat, 50);
          const idx = (py * s * dpr + px) * 4;
          data[idx] = rr;
          data[idx + 1] = gg;
          data[idx + 2] = bb;
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    // Soft outer shadow for depth
    ctx.globalCompositeOperation = "destination-over";
    ctx.beginPath();
    ctx.arc(cx * dpr, cy * dpr, r * dpr, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  }

  onMount(() => {
    // Measure container width and re-measure on resize
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w > 0) setMeasuredWidth(w);
    });
    ro.observe(containerRef);
    onCleanup(() => ro.disconnect());
  });

  // Redraw whenever measured size changes
  createEffect(() => {
    if (size() > 0) drawWheel();
  });

  // Horizontal offset when container is wider than the wheel
  const wheelLeft = () => (measuredWidth() - size()) / 2;

  // ----- Pointer → HS conversion -----
  function pointerToHs(e: PointerEvent): [number, number] {
    const rect = containerRef.getBoundingClientRect();
    const s = size();
    const offsetX = wheelLeft();
    const x = e.clientX - rect.left - offsetX - s / 2;
    const y = e.clientY - rect.top - s / 2;

    let hue = (Math.atan2(y, x) * 180) / Math.PI;
    if (hue < 0) hue += 360;

    const dist = Math.sqrt(x * x + y * y);
    const sat = Math.min((dist / innerRadius()) * 100, 100);

    return [Math.round(hue), Math.round(sat)];
  }

  // ----- Indicator position from HS (relative to container) -----
  function indicatorPos(): { x: number; y: number } | null {
    const hs = props.value;
    if (!hs) return null;
    const [h, s] = hs;
    const angle = (h * Math.PI) / 180;
    const dist = (s / 100) * innerRadius();
    return {
      x: wheelLeft() + radius() + Math.cos(angle) * dist,
      y: radius() + Math.sin(angle) * dist,
    };
  }

  // ----- Pointer handlers -----
  function onPointerDown(e: PointerEvent) {
    // Only respond to primary pointer
    if (e.button !== 0) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
    const hs = pointerToHs(e);
    props.onChange(hs);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging()) return;
    e.preventDefault();
    const hs = pointerToHs(e);
    props.onChange(hs);
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging()) return;
    setIsDragging(false);
    const hs = pointerToHs(e);
    props.onChangeEnd?.(hs);
  }

  // Cancel safety
  function onPointerCancel() {
    setIsDragging(false);
  }

  onCleanup(() => setIsDragging(false));

  const indicatorColor = () => {
    const hs = props.value;
    if (!hs) return "white";
    return `hsl(${hs[0]}, ${hs[1]}%, 50%)`;
  };

  return (
    <div
      ref={containerRef}
      class="relative mx-auto touch-none select-none overflow-visible"
      style={{ width: "100%", "max-width": `${maxSize()}px`, height: `${size()}px` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* Wheel canvas */}
      <canvas
        ref={canvasRef}
        class="mx-auto block overflow-hidden rounded-full border-2 border-border"
        style={{
          "box-shadow": "inset 0 0 12px rgba(0,0,0,0.25), 0 2px 12px rgba(0,0,0,0.3)",
        }}
      />
      {/* Center white-to-gray gradient for low saturation feedback */}
      <div
        class="pointer-events-none absolute rounded-full"
        style={{
          top: `${padding}px`,
          left: `${wheelLeft() + padding}px`,
          width: `${innerRadius() * 2}px`,
          height: `${innerRadius() * 2}px`,
          background: "radial-gradient(circle, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 35%)",
        }}
      />
      {/* Indicator dot */}
      {(() => {
        const pos = indicatorPos();
        if (!pos) return null;
        return (
          <div
            class="pointer-events-none absolute"
            style={{
              left: `${pos.x}px`,
              top: `${pos.y}px`,
              width: "24px",
              height: "24px",
              transform: "translate(-50%, -50%)",
              "border-radius": "50%",
              "background-color": indicatorColor(),
              border: "3px solid white",
              "box-shadow": "0 0 0 1px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.4)",
              transition: isDragging() ? "none" : "all 0.15s ease-out",
            }}
          />
        );
      })()}
    </div>
  );
}

// ----- HSL → RGB (for canvas) -----
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const sNorm = s / 100;
  const lNorm = l / 100;
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lNorm - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}
