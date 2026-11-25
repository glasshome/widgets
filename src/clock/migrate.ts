export function migrateClock(
  config: Record<string, unknown>,
  fromVersion: number,
): Record<string, unknown> {
  if (fromVersion >= 2) return config;
  return {
    ...config,
    ...(config.dateFormat === "MM/DD/YYYY" && { dateFormat: "auto" }),
    ...(config.timeFormat === "24" && { timeFormat: "auto" }),
  };
}
