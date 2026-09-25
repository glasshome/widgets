import { Button, useService } from "@glasshome/widget-sdk";
import { Icon } from "@iconify-icon/solid";
import { For } from "solid-js";

interface LockEntity {
  id: string;
  state: string;
  friendlyName: string;
}

const STATE_WORD: Record<string, string> = {
  locked: "Locked",
  unlocked: "Unlocked",
  open: "Open",
  opening: "Opening",
  locking: "Locking",
  unlocking: "Unlocking",
  jammed: "Jammed",
};

/** One row per lock, so a group unlocks door by door. */
export function LockControls(props: { entities: LockEntity[] }) {
  const { callService } = useService();
  return (
    <div class="flex flex-col gap-1">
      <For each={props.entities}>
        {(entity) => {
          const locked = () => entity.state === "locked";
          return (
            <div class="flex items-center gap-3 px-1 py-1.5">
              <Icon
                icon={locked() ? "mdi:lock" : "mdi:lock-open-variant"}
                width={18}
                class={locked() ? "text-success" : "text-warning"}
              />
              <span class="flex-1 truncate text-sm">{entity.friendlyName}</span>
              <span class="text-muted-foreground text-xs">
                {STATE_WORD[entity.state] ?? entity.state}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  callService("lock", locked() ? "unlock" : "lock", {}, { entity_id: entity.id })
                }
              >
                {locked() ? "Unlock" : "Lock"}
              </Button>
            </div>
          );
        }}
      </For>
    </div>
  );
}
