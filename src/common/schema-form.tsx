import {
	Input,
	Label,
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
	Switch,
} from "@glasshome/ui/solid";
import type { JSONSchema7 } from "json-schema";
import { createSignal, For, Show } from "solid-js";
import { AreaPicker } from "./area-picker";
import { EntitySelector } from "./entity-selector";

interface ExtendedJSONSchema extends JSONSchema7 {
	domain?: string;
	singleSelect?: boolean;
}

interface SchemaFormProps {
	schema: JSONSchema7;
	data: Record<string, unknown>;
	onChange: (data: Record<string, unknown>) => void;
	errors?: string[];
}

export function SchemaForm(props: SchemaFormProps) {
	const [formData, setFormData] = createSignal<Record<string, unknown>>({
		...props.data,
	});

	const properties = () => {
		const schema = props.schema;
		if (schema.type !== "object" || !schema.properties) return [];
		return Object.entries(schema.properties).map(([key, prop]) => ({
			key,
			prop: prop as ExtendedJSONSchema,
		}));
	};

	const updateField = (key: string, value: unknown) => {
		const next = { ...formData(), [key]: value };
		setFormData(next);
		props.onChange(next);
	};

	return (
		<div class="space-y-5">
			<For each={properties()}>
				{({ key, prop }) => (
					<div class="flex flex-col gap-1.5">
						<Label for={key}>{prop.title || key}</Label>

						{prop.description && <p class="text-muted-foreground text-xs">{prop.description}</p>}

						{/* Entity array with domain → EntitySelector */}
						{prop.type === "array" &&
						(prop.items as JSONSchema7)?.type === "string" &&
						(prop as ExtendedJSONSchema).domain ? (
							<EntitySelector
								entityIds={(formData()[key] as string[]) ?? (prop.default as string[]) ?? []}
								onEntityIdsChange={(ids) => updateField(key, ids)}
								domain={(prop as ExtendedJSONSchema).domain!}
								multiple={(prop as ExtendedJSONSchema).singleSelect !== true}
							/>
						) : /* Area picker */
						key.toLowerCase() === "areaid" || key.toLowerCase() === "area_id" ? (
							<AreaPicker
								value={String(formData()[key] ?? prop.default ?? "")}
								onChange={(val) => updateField(key, val)}
							/>
						) : /* Enum → Select */
						prop.enum ? (
							<Select
								value={String(formData()[key] ?? prop.default ?? "")}
								onChange={(val) => {
									if (val != null) updateField(key, val);
								}}
								options={((prop.enum as unknown[]) ?? []).map(String)}
								itemComponent={(itemProps) => (
									<SelectItem item={itemProps.item}>{String(itemProps.item.rawValue)}</SelectItem>
								)}
							>
								<SelectTrigger class="w-full">
									<SelectValue<string>>{(state) => state.selectedOption()}</SelectValue>
								</SelectTrigger>
								<SelectContent />
							</Select>
						) : /* Boolean → Switch */
						prop.type === "boolean" ? (
							<div class="flex items-center gap-3">
								<Switch
									checked={Boolean(formData()[key] ?? prop.default ?? false)}
									onChange={(checked) => updateField(key, checked)}
								/>
								<span class="text-sm">
									{(formData()[key] ?? prop.default) ? "Enabled" : "Disabled"}
								</span>
							</div>
						) : /* Number / Integer → Input type=number */
						prop.type === "number" || prop.type === "integer" ? (
							<Input
								id={key}
								type="number"
								value={Number(formData()[key] ?? prop.default ?? 0)}
								min={prop.minimum}
								max={prop.maximum}
								step={prop.type === "integer" ? 1 : "any"}
								onInput={(e) => updateField(key, Number(e.currentTarget.value))}
							/>
						) : /* String array (no domain) → StringListField */
						prop.type === "array" && (prop.items as JSONSchema7)?.type === "string" ? (
							<StringListField
								value={(formData()[key] as string[]) ?? (prop.default as string[]) ?? []}
								onChange={(val) => updateField(key, val)}
							/>
						) : /* Nested object */
						prop.type === "object" && prop.properties ? (
							<div class="flex flex-col gap-3 rounded-lg border border-border p-3">
								<For each={Object.entries(prop.properties as Record<string, ExtendedJSONSchema>)}>
									{([subKey, subProp]) => {
										const objVal = () => (formData()[key] as Record<string, unknown>) ?? {};
										const updateSubField = (value: unknown) => {
											updateField(key, { ...objVal(), [subKey]: value });
										};
										return (
											<div class="flex flex-col gap-1.5">
												<Label for={`${key}.${subKey}`}>
													{subProp.title || subKey}
												</Label>
												{subProp.enum ? (
													<Select
														value={String(objVal()[subKey] ?? subProp.default ?? "")}
														onChange={(val) => {
															if (val != null) updateSubField(val);
														}}
														options={((subProp.enum as unknown[]) ?? []).map(String)}
														itemComponent={(itemProps) => (
															<SelectItem item={itemProps.item}>
																{String(itemProps.item.rawValue)}
															</SelectItem>
														)}
													>
														<SelectTrigger class="w-full">
															<SelectValue<string>>
																{(state) => state.selectedOption()}
															</SelectValue>
														</SelectTrigger>
														<SelectContent />
													</Select>
												) : subProp.type === "boolean" ? (
													<div class="flex items-center gap-3">
														<Switch
															checked={Boolean(objVal()[subKey] ?? subProp.default ?? false)}
															onChange={(checked) => updateSubField(checked)}
														/>
														<span class="text-sm">
															{(objVal()[subKey] ?? subProp.default) ? "Enabled" : "Disabled"}
														</span>
													</div>
												) : (
													<Input
														id={`${key}.${subKey}`}
														type={
															subProp.type === "number" || subProp.type === "integer"
																? "number"
																: "text"
														}
														value={String(objVal()[subKey] ?? subProp.default ?? "")}
														onInput={(e) =>
															updateSubField(
																subProp.type === "number" || subProp.type === "integer"
																	? Number(e.currentTarget.value)
																	: e.currentTarget.value,
															)
														}
													/>
												)}
											</div>
										);
									}}
								</For>
							</div>
						) : (
							/* Default: text input */
							<Input
								id={key}
								type="text"
								value={String(formData()[key] ?? prop.default ?? "")}
								onInput={(e) => updateField(key, e.currentTarget.value)}
							/>
						)}
					</div>
				)}
			</For>

			{props.errors && props.errors.length > 0 && (
				<div class="rounded border border-destructive bg-destructive/10 p-3 text-destructive text-sm">
					<p class="mb-2 font-semibold">Validation errors:</p>
					<ul class="list-inside list-disc space-y-1">
						<For each={props.errors}>{(err) => <li>{err}</li>}</For>
					</ul>
				</div>
			)}
		</div>
	);
}

function StringListField(props: { value: string[]; onChange: (value: string[]) => void }) {
	const [input, setInput] = createSignal("");

	const addItem = (item: string) => {
		const trimmed = item.trim();
		if (!trimmed || props.value.includes(trimmed)) return;
		props.onChange([...props.value, trimmed]);
		setInput("");
	};

	return (
		<div class="flex flex-col gap-2">
			<Show when={props.value.length > 0}>
				<div class="flex flex-wrap gap-1.5">
					<For each={props.value}>
						{(item) => (
							<span class="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-secondary-foreground text-xs">
								{item}
								<button
									type="button"
									onClick={() => props.onChange(props.value.filter((v) => v !== item))}
									class="ml-0.5 rounded-sm hover:text-destructive"
								>
									<svg
										class="h-3 w-3"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										stroke-width="2"
									>
										<path d="M18 6L6 18M6 6l12 12" />
									</svg>
								</button>
							</span>
						)}
					</For>
				</div>
			</Show>
			<Input
				type="text"
				placeholder="Type and press Enter to add"
				value={input()}
				onInput={(e) => setInput(e.currentTarget.value)}
				onKeyDown={(e) => {
					if (e.key === "Enter") {
						e.preventDefault();
						addItem(input());
					}
				}}
			/>
		</div>
	);
}
