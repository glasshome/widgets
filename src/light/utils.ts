export function hsToCSS(hs: [number, number]): string {
  return `hsl(${hs[0]}, ${hs[1]}%, 50%)`;
}

export function brightnessToPercent(brightness: number): number {
  return Math.round((brightness / 255) * 100);
}
