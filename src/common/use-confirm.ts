import { createSignal, onCleanup } from "solid-js";

const CONFIRM_MS = 1600;

/**
 * For actions that leave no state to show (a scene, a button press, a stop): the keys that just ran,
 * for a moment. Confirms only after the call succeeds; a failed call is toasted by the host instead.
 */
export function useConfirm() {
  const [done, setDone] = createSignal<ReadonlySet<string>>(new Set());
  let timer: ReturnType<typeof setTimeout> | undefined;
  onCleanup(() => clearTimeout(timer));
  return {
    has: (key: string) => done().has(key),
    any: () => done().size > 0,
    /** Resolves whether it ran; a failure is already in front of the homeowner as the host's toast. */
    run: async (keys: string[], action: () => Promise<unknown>): Promise<boolean> => {
      try {
        await action();
      } catch {
        return false;
      }
      setDone(new Set(keys));
      clearTimeout(timer);
      timer = setTimeout(() => setDone(new Set()), CONFIRM_MS);
      return true;
    },
  };
}
