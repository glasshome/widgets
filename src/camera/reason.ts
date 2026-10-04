// Home Assistant command errors reject with a plain { code, message } object, not an Error.
export function reasonOf(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const { message, code } = err as { message?: unknown; code?: unknown };
    if (typeof message === "string") return message;
    if (typeof code === "string" || typeof code === "number") return `code ${code}`;
  }
  return String(err);
}
