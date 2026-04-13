import { getEntityView } from "@glasshome/sync-layer";
import { byDomain } from "@glasshome/sync-layer/solid";
import { Popover, PopoverAnchor, PopoverContent } from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, Show } from "solid-js";

interface EntitySelectorProps {
	entityIds: string[];
	onEntityIdsChange: (ids: string[]) => void;
	domain: string;
	multiple?: boolean;
}

function EntityRow(props: { entityId: string; selected: boolean; onToggle: (id: string) => void }) {
	const entity = createMemo(() => getEntityView(props.entityId));

	return (
		<button
			type="button"
			class={`flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
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
				<div class="truncate font-medium">{entity()?.friendlyName ?? props.entityId}</div>
				<div class="truncate text-muted-foreground text-xs">{props.entityId}</div>
			</div>
			<Show when={entity()}>
				{(e) => <span class="shrink-0 text-muted-foreground text-xs">{e().state}</span>}
			</Show>
		</button>
	);
}

export function EntitySelector(props: EntitySelectorProps) {
	const [open, setOpen] = createSignal(false);
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
			setOpen(false);
			setSearch("");
			return;
		}
		const current = props.entityIds;
		if (current.includes(entityId)) {
			props.onEntityIdsChange(current.filter((id) => id !== entityId));
		} else {
			props.onEntityIdsChange([...current, entityId]);
		}
	};

	const triggerLabel = () => {
		const count = props.entityIds.length;
		if (count === 0) return null;
		if (count === 1) {
			const view = getEntityView(props.entityIds[0]);
			return view?.friendlyName ?? props.entityIds[0];
		}
		return `${count} entities selected`;
	};

	return (
		<Popover
			open={open()}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					setOpen(false);
					setSearch("");
				}
			}}
			modal
		>
			<PopoverAnchor as="div">
				<button
					type="button"
					class="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
					onClick={() => (open() ? setOpen(false) : setOpen(true))}
				>
					<Show
						when={triggerLabel()}
						fallback={
							<span class="flex-1 text-left text-muted-foreground">
								Select {props.domain} entities...
							</span>
						}
					>
						{(label) => <span class="flex-1 truncate text-left">{label()}</span>}
					</Show>
					<Icon
						icon="mdi:chevron-down"
						width={16}
						height={16}
						class="shrink-0 text-muted-foreground"
					/>
				</button>
			</PopoverAnchor>
			<PopoverContent
				class="w-[var(--kb-popper-anchor-width)] p-0"
				onOpenAutoFocus={(e) => e.preventDefault()}
				onInteractOutside={() => setOpen(false)}
			>
				<div class="flex flex-col">
					<div class="border-b px-3 py-2">
						<input
							type="text"
							placeholder={`Search ${props.domain} entities...`}
							value={search()}
							onInput={(e) => setSearch(e.currentTarget.value)}
							class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
						/>
					</div>
					<div class="max-h-[280px] overflow-y-auto">
						<Show
							when={filtered().length > 0}
							fallback={
								<div class="py-4 text-center text-muted-foreground text-sm">
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
				</div>
			</PopoverContent>
		</Popover>
	);
}
