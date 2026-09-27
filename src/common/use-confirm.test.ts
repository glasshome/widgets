import { describe, expect, test } from "bun:test";
import { createRoot } from "solid-js";
import { useConfirm } from "./use-confirm";

describe("useConfirm", () => {
  test("confirms the keys once the action succeeds", async () => {
    await createRoot(async (dispose) => {
      const confirm = useConfirm();
      await confirm.run(["a"], async () => {});
      expect(confirm.has("a")).toBe(true);
      expect(confirm.has("b")).toBe(false);
      expect(confirm.any()).toBe(true);
      dispose();
    });
  });

  test("confirms nothing when the action fails, and says so", async () => {
    await createRoot(async (dispose) => {
      const confirm = useConfirm();
      const ran = await confirm.run(["a"], async () => {
        throw new Error("offline");
      });
      expect(ran).toBe(false);
      expect(confirm.any()).toBe(false);
      dispose();
    });
  });
});
