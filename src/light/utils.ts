export const COLOR_PRESETS = [
  { name: "Sunset", hs: [15, 100] as [number, number] },
  { name: "Coral", hs: [25, 100] as [number, number] },
  { name: "Golden", hs: [45, 100] as [number, number] },
  { name: "Yellow", hs: [60, 100] as [number, number] },
  { name: "Lime", hs: [90, 100] as [number, number] },
  { name: "Mint", hs: [150, 100] as [number, number] },
  { name: "Cyan", hs: [180, 100] as [number, number] },
  { name: "Sky", hs: [200, 100] as [number, number] },
  { name: "Ocean", hs: [220, 100] as [number, number] },
  { name: "Purple", hs: [270, 100] as [number, number] },
  { name: "Pink", hs: [320, 100] as [number, number] },
  { name: "Rose", hs: [340, 100] as [number, number] },
] as const;

export function getTempPresets(minKelvin: number, maxKelvin: number) {
  const range = maxKelvin - minKelvin;
  return [
    { name: "Warm", kelvin: minKelvin },
    { name: "Soft", kelvin: Math.round(minKelvin + range * 0.25) },
    { name: "Neutral", kelvin: Math.round(minKelvin + range * 0.5) },
    { name: "Cool", kelvin: Math.round(minKelvin + range * 0.75) },
    { name: "Daylight", kelvin: maxKelvin },
  ];
}

export function hsToCSS(hs: [number, number]): string {
  return `hsl(${hs[0]}, ${hs[1]}%, 50%)`;
}

export function brightnessToPercent(brightness: number): number {
  return Math.round((brightness / 255) * 100);
}

export function percentToBrightness(percent: number): number {
  return Math.round((percent / 100) * 255);
}

export function formatBrightness(percent: number): string {
  return `${Math.round(percent)}%`;
}
