export function greetingForHour(hour: number): string {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function hourIn(date: Date, timeZone?: string): number {
  const part = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    ...(timeZone && { timeZone }),
  })
    .formatToParts(date)
    .find((p) => p.type === "hour");
  return Number(part?.value ?? "0") % 24;
}
