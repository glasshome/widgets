import { getEntityView } from "@glasshome/sync-layer";
import { byDomain } from "@glasshome/sync-layer/solid";
import { createMemo, createSignal, For, Show } from "solid-js";

interface EntitySelectorProps {
  entityIds: string[];
  onEntityIdsChange: (ids: string[]) => void;
  domain: string;
  multiple?: boolean;
}

function EntityRow(props: { entityId: string; selected: boolean; onToggle: (id: string) => void }) {
  // Use getEntityView directly — no subscription registration needed for picker UI
  const entity = createMemo(() => getEntityView(props.entityId));

  return (
    <button
      type="button"
      class={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
        props.selected ? "bg-primary/10 text-primary" : "hover:bg-muted"
      }`}
      onClick={() => props.onToggle(props.entityId)}
    >
      <div
        class={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          props.selected
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/30"
        }`}
      >
        <Show when={props.selected}>
          <svg
            class="h-3 w-3"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="3"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </Show>
      </div>
      <div class="min-w-0 flex-1">
        <div class="truncate font-medium text-sm">{entity()?.friendlyName ?? props.entityId}</div>
        <div class="truncate text-muted-foreground text-xs">{props.entityId}</div>
      </div>
      <Show when={entity()}>
        <span class="shrink-0 text-muted-foreground text-xs">{entity()!.state}</span>
      </Show>
    </button>
  );
}

export function EntitySelector(props: EntitySelectorProps) {
  const [search, setSearch] = createSignal("");

  const domainEntities = createMemo(() => {
    const domains = byDomain();
    return domains[props.domain] ?? [];
  });

  const filtered = createMemo(() => {
    const q = search().toLowerCase();
    if (!q) return domainEntities();
    return domainEntities().filter((id) => id.toLowerCase().includes(q));
  });

  const toggleEntity = (entityId: string) => {
    if (props.multiple === false) {
      props.onEntityIdsChange([entityId]);
      return;
    }
    const current = props.entityIds;
    if (current.includes(entityId)) {
      props.onEntityIdsChange(current.filter((id) => id !== entityId));
    } else {
      props.onEntityIdsChange([...current, entityId]);
    }
  };

  return (
    <div class="flex flex-col gap-2">
      <input
        type="text"
        placeholder={`Search ${props.domain} entities...`}
        value={search()}
        onInput={(e) => setSearch(e.currentTarget.value)}
        class="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div class="max-h-64 overflow-y-auto rounded-lg border border-border">
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="p-4 text-center text-muted-foreground text-sm">
              No {props.domain} entities found
            </div>
          }
        >
          <div class="flex flex-col gap-0.5 p-1">
            <For each={filtered()}>
              {(entityId) => (
                <EntityRow
                  entityId={entityId}
                  selected={props.entityIds.includes(entityId)}
                  onToggle={toggleEntity}
                />
              )}
            </For>
          </div>
        </Show>
      </div>
      <Show when={props.entityIds.length > 0}>
        <p class="text-muted-foreground text-xs">{props.entityIds.length} selected</p>
      </Show>
    </div>
  );
}
