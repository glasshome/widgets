import { areas as queryAreas } from "@glasshome/sync-layer";
import { Input, Popover, PopoverAnchor, PopoverContent } from "@glasshome/ui/solid";
import { Icon } from "@iconify-icon/solid";
import { createMemo, createSignal, For, Show } from "solid-js";

interface AreaSnapshot {
	id: string;
	name: string;
	icon: string | null;
	entityCount: number;
}

interface AreaPickerProps {
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	class?: string;
	allowClear?: boolean;
}

export function AreaPicker(props: AreaPickerProps) {
	const [open, setOpen] = createSignal(false);
	const [search, setSearch] = createSignal("");
	const [snapshot, setSnapshot] = createSignal<AreaSnapshot[]>([]);

	const handleOpen = () => {
		const areaList = queryAreas().get();
		setSnapshot(
			areaList.map((a) => ({
				id: a.id,
				name: a.name,
				icon: a.icon,
				entityCount: a.entities.length,
			})),
		);
		setOpen(true);
	};

	const filtered = createMemo(() => {
		const q = search().toLowerCase();
		if (!q) return snapshot();
		return snapshot().filter(
			(a) => a.name.toLowerCase().includes(q) || a.id.toLowerCase().includes(q),
		);
	});

	const selectedLabel = createMemo(() => {
		const v = props.value;
		if (!v) return undefined;
		const fromSnapshot = snapshot().find((a) => a.id === v);
		if (fromSnapshot) return fromSnapshot;
		const areaList = queryAreas().get();
		const found = areaList.find((a) => a.id === v);
		if (!found) return undefined;
		return { id: found.id, name: found.name, icon: found.icon, entityCount: found.entities.length };
	});

	const selectArea = (areaId: string) => {
		props.onChange(areaId);
		setOpen(false);
		setSearch("");
	};

	const clear = () => {
		props.onChange("");
		setOpen(false);
		setSearch("");
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
			<PopoverAnchor as="div" class={props.class}>
				<button
					type="button"
					class="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
					onClick={() => (open() ? setOpen(false) : handleOpen())}
				>
					<Show
						when={selectedLabel()}
						fallback={
							<span class="flex-1 text-left text-muted-foreground">
								{props.placeholder ?? "Select area..."}
							</span>
						}
					>
						{(area) => (
							<>
								<div class="flex size-4 shrink-0 items-center justify-center">
									<Icon icon={area().icon || "mdi:home-floor-1"} width={16} height={16} />
								</div>
								<span class="flex-1 truncate text-left">{area().name}</span>
							</>
						)}
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
						<Input
							type="text"
							placeholder="Search areas..."
							value={search()}
							onInput={(e) => setSearch(e.currentTarget.value)}
							class="border-none bg-transparent shadow-none outline-none focus-visible:ring-0"
						/>
					</div>
					<div class="max-h-[280px] overflow-y-auto">
						<Show when={filtered().length === 0}>
							<div class="py-4 text-center text-muted-foreground text-sm">No areas found</div>
						</Show>
						<div class="flex flex-col gap-0.5 p-1">
							<Show when={props.allowClear !== false && props.value}>
								<button
									type="button"
									class="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
									onClick={clear}
								>
									<div class="flex size-[18px] shrink-0 items-center justify-center">
										<Icon
											icon="mdi:close-circle-outline"
											width={18}
											height={18}
											class="text-muted-foreground"
										/>
									</div>
									<span class="text-muted-foreground">Clear selection</span>
								</button>
							</Show>
							<For each={filtered()}>
								{(area) => (
									<button
										type="button"
										class="group flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
										classList={{
											"bg-primary/10 text-primary": props.value === area.id,
										}}
										onClick={() => selectArea(area.id)}
									>
										<div class="flex size-[18px] shrink-0 items-center justify-center">
											<Icon icon={area.icon || "mdi:home-floor-1"} width={18} height={18} />
										</div>
										<div class="flex min-w-0 flex-1 flex-col">
											<span class="truncate font-medium">{area.name}</span>
										</div>
										<span
											class="shrink-0 text-muted-foreground text-xs group-hover:text-accent-foreground/60"
											classList={{
												"!text-primary/60": props.value === area.id,
											}}
										>
											{area.entityCount} entities
										</span>
									</button>
								)}
							</For>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
