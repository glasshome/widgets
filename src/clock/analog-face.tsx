import { createEffect, onMount } from "solid-js";

interface AnalogClockFaceProps {
  time: Date;
  showSeconds?: boolean;
}

export function AnalogClockFace(props: AnalogClockFaceProps) {
  let canvas!: HTMLCanvasElement;
  const SIZE = 200;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE / 2 - 10;

  function getColor(varName: string, fallback: string): string {
    if (!canvas) return fallback;
    const value = getComputedStyle(canvas).getPropertyValue(varName).trim();
    return value || fallback;
  }

  function draw() {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const fg = getColor("--foreground", "#e4e4e7");
    const muted = getColor("--muted-foreground", "#a1a1aa");
    const destructive = getColor("--destructive", "#ef4444");

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Clock face circle
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, RADIUS, 0, Math.PI * 2);
    ctx.strokeStyle = muted;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hour marks
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const isCardinal = i % 3 === 0;
      const innerR = RADIUS - (isCardinal ? 15 : 8);
      const outerR = RADIUS - 3;

      ctx.beginPath();
      ctx.moveTo(CENTER + Math.cos(angle) * innerR, CENTER + Math.sin(angle) * innerR);
      ctx.lineTo(CENTER + Math.cos(angle) * outerR, CENTER + Math.sin(angle) * outerR);
      ctx.strokeStyle = isCardinal ? fg : muted;
      ctx.lineWidth = isCardinal ? 2.5 : 1.5;
      ctx.stroke();
    }

    const hours = props.time.getHours();
    const minutes = props.time.getMinutes();
    const seconds = props.time.getSeconds();

    // Hour hand
    const hourAngle = ((hours % 12) / 12 + minutes / 720) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(CENTER + Math.cos(hourAngle) * RADIUS * 0.5, CENTER + Math.sin(hourAngle) * RADIUS * 0.5);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();

    // Minute hand
    const minuteAngle = (minutes / 60 + seconds / 3600) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(CENTER, CENTER);
    ctx.lineTo(CENTER + Math.cos(minuteAngle) * RADIUS * 0.7, CENTER + Math.sin(minuteAngle) * RADIUS * 0.7);
    ctx.strokeStyle = fg;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();

    // Second hand
    if (props.showSeconds) {
      const secondAngle = (seconds / 60) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(CENTER, CENTER);
      ctx.lineTo(CENTER + Math.cos(secondAngle) * RADIUS * 0.8, CENTER + Math.sin(secondAngle) * RADIUS * 0.8);
      ctx.strokeStyle = destructive;
      ctx.lineWidth = 1;
      ctx.lineCap = "round";
      ctx.stroke();
    }

    // Center dot
    ctx.beginPath();
    ctx.arc(CENTER, CENTER, 4, 0, Math.PI * 2);
    ctx.fillStyle = fg;
    ctx.fill();
  }

  onMount(() => {
    canvas.width = SIZE;
    canvas.height = SIZE;
    draw();
  });

  createEffect(() => {
    // Track time reactively
    void props.time;
    draw();
  });

  return (
    <canvas
      ref={canvas!}
      class="w-full h-full"
      style={{ "aspect-ratio": "1", "max-width": "100%", "max-height": "100%" }}
    />
  );
}
