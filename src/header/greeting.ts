export function greetingKey(
  hour: number,
):
  | "header.greeting.night"
  | "header.greeting.morning"
  | "header.greeting.afternoon"
  | "header.greeting.evening" {
  if (hour < 5) return "header.greeting.night";
  if (hour < 12) return "header.greeting.morning";
  if (hour < 18) return "header.greeting.afternoon";
  return "header.greeting.evening";
}
