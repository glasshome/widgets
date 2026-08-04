/* Tailwind caveat for components in this directory: the per-widget CSS build
 * scans ui, widget-sdk, and the widget's OWN directory, never src/common. A
 * utility class used only in here silently drops from the emitted CSS; use
 * classes that also appear in ui/widget-sdk sources, or ship a companion CSS
 * file imported by the component (see mode-transition.css). */
export { getBinarySensorIcon, getCoverIcon, getSensorIcon } from "./device-class-icons";
export { formatTemperature } from "./format";
export { ModeChips } from "./mode-chips";
export { useSetpoints } from "./use-setpoints";
export type { WidgetDebugData } from "./widget-debug-view";
export { buildDebugData, WidgetDebugView } from "./widget-debug-view";
export { widgetDialogProps } from "./widget-dialog-props";
