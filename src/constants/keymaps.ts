import { Key, matchesKey } from "@mariozechner/pi-tui";
import type { AskConfig, AskConfigKeymaps } from "../config/schema.ts";

const DIGIT_SHORTCUT_PATTERN = /^[1-9]$/;
const LETTER_PATTERN = /^[a-z]$/;
const DIGIT_PATTERN = /^[0-9]$/;
const SYMBOL_PATTERN = /^[`\-=[\]\\;'.,/!@#$%^&*()_+|~{}:<>?]$/;
const FUNCTION_KEY_PATTERN = /^f([1-9]|1[0-2])$/;
const MODIFIER_ORDER = ["ctrl", "shift", "alt", "super"] as const;
const KNOWN_SPECIAL_KEYS = new Set([
	"esc",
	"enter",
	"tab",
	"space",
	"backspace",
	"delete",
	"insert",
	"clear",
	"home",
	"end",
	"pageUp",
	"pageDown",
	"up",
	"down",
	"left",
	"right",
	"f1",
	"f2",
	"f3",
	"f4",
	"f5",
	"f6",
	"f7",
	"f8",
	"f9",
	"f10",
	"f11",
	"f12",
] as const);
const RESERVED_CONFIGURABLE_BINDINGS = new Set([
	"?",
	"tab",
	"shift+tab",
	"left",
	"right",
	"1",
	"2",
	"3",
	"4",
	"5",
	"6",
	"7",
	"8",
	"9",
]);
const ACTION_LABEL_OVERRIDES: Partial<Record<AskKeyBindingId, string>> = {
	nextTab: "Tab / →",
	previousTab: "Shift+Tab / ←",
	numberShortcut: "1..9",
};

type KeyId = Parameters<typeof matchesKey>[1];
type InputKey = KeyId | (string & {});

type ConfigurableBindingMetadata = Omit<AskKeyBinding, "keys" | "label"> & {
	id: AskConfigurableKeyAction;
};
type FixedBindingMetadata = Omit<AskKeyBinding, "keys" | "label"> & {
	id: AskFixedKeyBindingId;
	keys: readonly InputKey[];
	label?: string;
};

type ModifierName = (typeof MODIFIER_ORDER)[number];

export type AskKeyBindingKind = "command" | "affordance";
export type AskConfigurableKeyAction = keyof AskConfigKeymaps;
export type AskFixedKeyBindingId =
	| "settings"
	| "nextTab"
	| "previousTab"
	| "numberShortcut"
	| "fileReference";
export type AskKeyBindingId = AskConfigurableKeyAction | AskFixedKeyBindingId;

export interface AskKeyBinding {
	contexts: readonly string[];
	description: string;
	id: AskKeyBindingId;
	keys: readonly InputKey[];
	kind: AskKeyBindingKind;
	label: string;
}

export type FooterKeymapContext =
	| "default"
	| "multi"
	| "submit"
	| "input"
	| "note";

export const DEFAULT_ASK_KEYMAPS: AskConfigKeymaps = {
	cancel: "esc",
	dismiss: "ctrl+c",
	toggle: "space",
	confirm: "enter",
	optionNote: "n",
	questionNote: "shift+n",
	previousOption: "up",
	nextOption: "down",
};

const CONFIGURABLE_BINDING_METADATA: readonly ConfigurableBindingMetadata[] = [
	{
		id: "cancel",
		kind: "command",
		description: "Cancel flow or close/save editor draft",
		contexts: ["Main flow", "Editors"],
	},
	{
		id: "dismiss",
		kind: "command",
		description: "Dismiss entire ask flow immediately",
		contexts: ["Anywhere"],
	},
	{
		id: "toggle",
		kind: "command",
		description: "Toggle selected option",
		contexts: ["Questions"],
	},
	{
		id: "confirm",
		kind: "command",
		description: "Confirm selection, continue, save, or submit",
		contexts: ["Main flow", "Editors"],
	},
	{
		id: "optionNote",
		kind: "command",
		description: "Edit selected option note",
		contexts: ["Question tabs"],
	},
	{
		id: "questionNote",
		kind: "command",
		description: "Edit question note",
		contexts: ["Question tabs"],
	},
	{
		id: "previousOption",
		kind: "command",
		description: "Move to previous option/action",
		contexts: ["Main flow", "Empty editor"],
	},
	{
		id: "nextOption",
		kind: "command",
		description: "Move to next option/action",
		contexts: ["Main flow", "Empty editor"],
	},
] as const;

const FIXED_BINDING_METADATA: readonly FixedBindingMetadata[] = [
	{
		id: "settings",
		keys: ["?"],
		kind: "command",
		description: "Open ask settings",
		contexts: ["Main flow", "Empty editor"],
	},
	{
		id: "nextTab",
		keys: [Key.tab, Key.right],
		kind: "command",
		description: "Switch to next tab",
		contexts: ["Main flow", "Empty editor"],
	},
	{
		id: "previousTab",
		keys: [Key.shift("tab"), Key.left],
		kind: "command",
		description: "Switch to previous tab",
		contexts: ["Main flow", "Empty editor"],
	},
	{
		id: "numberShortcut",
		keys: ["1..9"],
		kind: "command",
		label: "1..9",
		description: "Quick-select option or submit action",
		contexts: ["Main flow", "Submit tab"],
	},
	{
		id: "fileReference",
		keys: ["@"],
		kind: "affordance",
		description: "Reference files while typing answers or notes",
		contexts: ["Editors"],
	},
] as const;

const footerHint = (
	binding: AskKeyBinding,
	action: string,
	label = binding.label
) => `${label} ${action}`;

export function formatKeybindingLabel(key: string): string {
	return key
		.split("+")
		.map((part) => {
			if (part.length <= 1) {
				return part.toUpperCase();
			}
			switch (part) {
				case "up":
					return "↑";
				case "down":
					return "↓";
				case "left":
					return "←";
				case "right":
					return "→";
				case "pageUp":
				case "pageDown":
					return part;
				default:
					return part.charAt(0).toUpperCase() + part.slice(1);
			}
		})
		.join("+");
}

export function matchesBinding(data: string, binding: AskKeyBinding): boolean {
	return binding.keys.some((key) => {
		if (key.length === 1) {
			return data === key;
		}
		return matchesKey(data, key as KeyId);
	});
}

export function matchesDigitShortcut(data: string): number | null {
	return DIGIT_SHORTCUT_PATTERN.test(data) ? Number(data) : null;
}

export function getAskKeyBindings(
	config: AskConfig
): Record<AskKeyBindingId, AskKeyBinding> {
	const customizable: Record<AskConfigurableKeyAction, AskKeyBinding> = {
		cancel: createCustomizableBinding(config, "cancel"),
		dismiss: createCustomizableBinding(config, "dismiss"),
		toggle: createCustomizableBinding(config, "toggle"),
		confirm: createCustomizableBinding(config, "confirm"),
		optionNote: createCustomizableBinding(config, "optionNote"),
		questionNote: createCustomizableBinding(config, "questionNote"),
		previousOption: createCustomizableBinding(config, "previousOption"),
		nextOption: createCustomizableBinding(config, "nextOption"),
	};
	const fixed = Object.fromEntries(
		FIXED_BINDING_METADATA.map((binding) => [
			binding.id,
			{
				...binding,
				label:
					binding.label ??
					ACTION_LABEL_OVERRIDES[binding.id] ??
					binding.keys
						.map((key) => formatKeybindingLabel(String(key)))
						.join(" / "),
			},
		])
	) as Record<AskFixedKeyBindingId, AskKeyBinding>;
	return {
		...customizable,
		...fixed,
	};
}

export function getAskKeymaps(config: AskConfig): {
	customizable: readonly AskKeyBinding[];
	fixed: readonly AskKeyBinding[];
} {
	const bindings = getAskKeyBindings(config);
	return {
		customizable: CONFIGURABLE_BINDING_METADATA.map(({ id }) => bindings[id]),
		fixed: FIXED_BINDING_METADATA.map(({ id }) => bindings[id]),
	};
}

export function renderFooterKeymaps(
	config: AskConfig,
	context: FooterKeymapContext
): string {
	const bindings = getAskKeyBindings(config);
	const optionNavigationLabel = `${bindings.previousOption.label}/${bindings.nextOption.label}`;
	const tabNavigationLabel = "⇆";
	const noteNavigationLabel = `${bindings.optionNote.label}/${bindings.questionNote.label}`;
	const hintsByContext: Record<FooterKeymapContext, readonly string[]> = {
		input: [
			footerHint(bindings.confirm, "submit"),
			footerHint(bindings.cancel, "close"),
			footerHint(bindings.settings, "settings"),
		],
		note: [
			footerHint(bindings.confirm, "save"),
			footerHint(bindings.cancel, "close"),
			footerHint(bindings.settings, "settings"),
		],
		submit: [
			footerHint(bindings.numberShortcut, "hotkeys"),
			footerHint(bindings.previousOption, "select", optionNavigationLabel),
			footerHint(bindings.confirm, "confirm"),
			footerHint(bindings.cancel, "cancel"),
			footerHint(bindings.settings, "settings"),
		],
		multi: [
			footerHint(bindings.nextTab, "tab", tabNavigationLabel),
			footerHint(bindings.previousOption, "select", optionNavigationLabel),
			footerHint(bindings.toggle, "toggle"),
			footerHint(bindings.confirm, "continue"),
			footerHint(bindings.optionNote, "note", noteNavigationLabel),
			footerHint(bindings.cancel, "dismiss"),
			footerHint(bindings.settings, "settings"),
		],
		default: [
			footerHint(bindings.nextTab, "tab", tabNavigationLabel),
			footerHint(bindings.previousOption, "select", optionNavigationLabel),
			footerHint(bindings.confirm, "confirm"),
			footerHint(bindings.optionNote, "note", noteNavigationLabel),
			footerHint(bindings.cancel, "dismiss"),
			footerHint(bindings.settings, "settings"),
		],
	};
	return ` ${hintsByContext[context].join(" · ")}`;
}

export function normalizeConfiguredKeymaps(
	keymaps: Partial<Record<AskConfigurableKeyAction, unknown>> | undefined
): { ok: true; keymaps: AskConfigKeymaps } | { ok: false; error: string } {
	if (!keymaps) {
		return { ok: true, keymaps: { ...DEFAULT_ASK_KEYMAPS } };
	}

	const normalized = {} as AskConfigKeymaps;
	for (const action of Object.keys(
		DEFAULT_ASK_KEYMAPS
	) as AskConfigurableKeyAction[]) {
		const rawValue = keymaps[action] ?? DEFAULT_ASK_KEYMAPS[action];
		if (typeof rawValue !== "string") {
			return { ok: false, error: `Invalid keymap for ${action}: missing key` };
		}
		const parsed = normalizeKeyId(rawValue);
		if (!parsed.ok) {
			return {
				ok: false,
				error: `Invalid keymap for ${action}: ${parsed.error}`,
			};
		}
		if (RESERVED_CONFIGURABLE_BINDINGS.has(parsed.keyId)) {
			return {
				ok: false,
				error: `Reserved keymap for ${action}: ${formatKeybindingLabel(parsed.keyId)}.`,
			};
		}
		normalized[action] = parsed.keyId;
	}

	const seen = new Map<string, AskConfigurableKeyAction>();
	for (const action of Object.keys(normalized) as AskConfigurableKeyAction[]) {
		const key = normalized[action];
		const existing = seen.get(key);
		if (existing) {
			return {
				ok: false,
				error: `Duplicate keymap ${formatKeybindingLabel(key)} for ${existing} and ${action}.`,
			};
		}
		seen.set(key, action);
	}

	return { ok: true, keymaps: normalized };
}

function normalizeKeyId(
	rawKey: string
): { ok: true; keyId: string } | { ok: false; error: string } {
	const normalizedInput = rawKey.trim();
	if (!normalizedInput) {
		return { ok: false, error: "empty binding" };
	}

	const parts = normalizedInput
		.toLowerCase()
		.split("+")
		.map((part) => part.trim())
		.filter(Boolean);
	if (parts.length === 0) {
		return { ok: false, error: "empty binding" };
	}

	const basePart = parts.at(-1);
	if (!basePart) {
		return { ok: false, error: "missing key" };
	}

	const modifiers = new Set<ModifierName>();
	for (const part of parts.slice(0, -1)) {
		const modifier = normalizeModifierName(part);
		if (!modifier) {
			return { ok: false, error: `unsupported modifier ${part}` };
		}
		modifiers.add(modifier);
	}

	const baseKey = normalizeBaseKey(basePart);
	if (!baseKey) {
		return { ok: false, error: `unsupported key ${basePart}` };
	}

	const modifierPrefix = MODIFIER_ORDER.filter((modifier) =>
		modifiers.has(modifier)
	);
	return {
		ok: true,
		keyId: [...modifierPrefix, baseKey].join("+"),
	};
}

function createCustomizableBinding(
	config: AskConfig,
	id: AskConfigurableKeyAction
): AskKeyBinding {
	const binding = CONFIGURABLE_BINDING_METADATA.find(
		(entry) => entry.id === id
	);
	if (!binding) {
		throw new Error(`Unknown customizable ask key binding: ${id}`);
	}
	const key = config.keymaps[id];
	return {
		...binding,
		keys: [key],
		label: formatKeybindingLabel(key),
	};
}

function normalizeModifierName(part: string): ModifierName | undefined {
	switch (part) {
		case "ctrl":
		case "control":
		case "ctl":
			return "ctrl";
		case "shift":
			return "shift";
		case "alt":
		case "option":
			return "alt";
		case "super":
		case "cmd":
		case "command":
		case "meta":
		case "win":
		case "windows":
			return "super";
		default:
			return;
	}
}

function normalizeBaseKey(part: string): string | undefined {
	const aliased = normalizeBaseKeyAlias(part);
	if (
		LETTER_PATTERN.test(aliased) ||
		DIGIT_PATTERN.test(aliased) ||
		SYMBOL_PATTERN.test(aliased)
	) {
		return aliased;
	}
	if (FUNCTION_KEY_PATTERN.test(aliased)) {
		return aliased;
	}
	if (
		KNOWN_SPECIAL_KEYS.has(
			aliased as typeof KNOWN_SPECIAL_KEYS extends Set<infer T> ? T : never
		)
	) {
		return aliased;
	}
	return;
}

function normalizeBaseKeyAlias(part: string): string {
	switch (part) {
		case "escape":
			return "esc";
		case "return":
			return "enter";
		case "spacebar":
			return "space";
		case "del":
			return "delete";
		case "ins":
			return "insert";
		case "pgup":
		case "pageup":
			return "pageUp";
		case "pgdown":
		case "pagedown":
			return "pageDown";
		case "arrowup":
			return "up";
		case "arrowdown":
			return "down";
		case "arrowleft":
			return "left";
		case "arrowright":
			return "right";
		default:
			return part;
	}
}
