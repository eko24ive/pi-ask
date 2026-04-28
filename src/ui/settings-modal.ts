import {
	Key,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";
import type { AskConfig } from "../config/schema.ts";
import type { AskConfigNotice } from "../config/store.ts";
import { type AskKeyBinding, getAskKeymaps } from "../constants/keymaps.ts";
import { wrapText } from "../text.ts";
import {
	type AskSettingsState,
	clearTransientNotice,
	completeSave,
	createAskSettingsState,
	failSave,
	isDirty,
	moveBehaviourFocus,
	moveSettingsTab,
	requestDiscard,
	setSaving,
	shouldDiscard,
	toggleBehaviourSetting,
} from "./settings-state.ts";

interface Theme {
	bg(color: string, text: string): string;
	fg(color: string, text: string): string;
}

interface TuiLike {
	requestRender(): void;
}

interface AskSettingsModalOptions {
	configPath: string;
	notice?: AskConfigNotice;
	onClose: () => void;
	onSave: (config: AskConfig) => Promise<AskConfig>;
	savedConfig: AskConfig;
	tui: TuiLike;
}

const MIN_WIDTH = 24;
const COMPACT_WIDTH = 46;
const TAB_GAP = "  ";
const DISCARD_WINDOW_MS = 1000;
const SETTINGS_MODAL_KEYS = {
	close: [Key.escape, Key.ctrl("c"), "?"],
	nextTab: [Key.tab, Key.right],
	previousTab: [Key.shift("tab"), Key.left],
	up: [Key.up],
	down: [Key.down],
	toggle: [Key.space],
	save: [Key.ctrl("s")],
} as const;
const BEHAVIOUR_ROWS = [
	{
		description:
			"Auto-submit completed ask flows when no question or option notes were added.",
		key: "autoSubmitWhenAnsweredWithoutNotes",
		getValue(config: AskConfig) {
			return config.behaviour.autoSubmitWhenAnsweredWithoutNotes;
		},
		label: "Auto-submit when answered without notes",
	},
	{
		description:
			"Require a second cancel or dismiss action before discarding answered or drafted ask content.",
		key: "confirmDismissWhenDirty",
		getValue(config: AskConfig) {
			return config.behaviour.confirmDismissWhenDirty;
		},
		label: "Confirm dismiss when dirty",
	},
	{
		description: "Show footer keymap hints at the bottom of the ask flow.",
		key: "showFooterHints",
		getValue(config: AskConfig) {
			return config.behaviour.showFooterHints;
		},
		label: "Show footer hints",
	},
] as const;

type SettingsTab = "keymaps" | "behaviour";

function padToWidth(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

export class AskSettingsModal {
	private closed = false;
	private readonly configPath: string;
	private readonly onClose: () => void;
	private readonly onSave: (config: AskConfig) => Promise<AskConfig>;
	private state: AskSettingsState;
	private readonly theme: Theme;
	private readonly tui: TuiLike;

	constructor(theme: Theme, options: AskSettingsModalOptions) {
		this.theme = theme;
		this.configPath = options.configPath;
		this.onClose = options.onClose;
		this.onSave = options.onSave;
		this.state = createAskSettingsState(options.savedConfig, options.notice);
		this.tui = options.tui;
	}

	handleInput(data: string): void {
		if (this.handleGlobalInput(data)) {
			return;
		}
		if (this.state.activeTab === "behaviour") {
			this.handleBehaviourInput(data);
		}
	}

	render(width: number): string[] {
		const layout = createLayout(this.theme, this.state.activeTab, width);
		const lines = [...layout.headerLines];

		if (this.state.activeTab === "keymaps") {
			lines.push(
				...renderKeymapsTab(
					this.theme,
					layout,
					this.state.savedConfig,
					this.configPath,
					this.state.notice
				)
			);
		} else {
			lines.push(...renderBehaviourTab(this.theme, this.state, layout));
		}

		lines.push(...renderBottomPanel(this.theme, this.state, layout));
		return lines;
	}

	invalidate(): void {
		// State-driven modal; nothing cached across theme changes.
	}

	dispose(): void {
		this.close();
	}

	private handleGlobalInput(data: string): boolean {
		const closeRequested = matchesAny(data, SETTINGS_MODAL_KEYS.close);
		if (!closeRequested) {
			this.state = clearTransientNotice(this.state);
		}
		if (closeRequested) {
			this.handleClose();
			return true;
		}
		if (matchesAny(data, SETTINGS_MODAL_KEYS.save)) {
			this.save().catch(() => {
				// save() handles state updates and rerendering on failure
			});
			return true;
		}
		if (matchesAny(data, SETTINGS_MODAL_KEYS.nextTab)) {
			this.state = moveSettingsTab(this.state, 1);
			this.refresh();
			return true;
		}
		if (matchesAny(data, SETTINGS_MODAL_KEYS.previousTab)) {
			this.state = moveSettingsTab(this.state, -1);
			this.refresh();
			return true;
		}
		return false;
	}

	private handleBehaviourInput(data: string): void {
		if (matchesAny(data, SETTINGS_MODAL_KEYS.up)) {
			this.state = moveBehaviourFocus(this.state, -1, BEHAVIOUR_ROWS.length);
			this.refresh();
			return;
		}
		if (matchesAny(data, SETTINGS_MODAL_KEYS.down)) {
			this.state = moveBehaviourFocus(this.state, 1, BEHAVIOUR_ROWS.length);
			this.refresh();
			return;
		}
		if (matchesAny(data, SETTINGS_MODAL_KEYS.toggle)) {
			const row = BEHAVIOUR_ROWS[this.state.behaviourFocusIndex];
			if (!row) {
				return;
			}
			this.state = toggleBehaviourSetting(this.state, row.key);
			this.refresh();
		}
	}

	private handleClose(): void {
		if (!isDirty(this.state)) {
			this.close();
			return;
		}
		const now = Date.now();
		if (shouldDiscard(this.state, now)) {
			this.close();
			return;
		}
		this.state = requestDiscard(this.state, now, DISCARD_WINDOW_MS);
		this.refresh();
	}

	private async save(): Promise<void> {
		if (this.state.saving) {
			return;
		}
		this.state = setSaving(this.state);
		this.refresh();
		try {
			const savedConfig = await this.onSave(this.state.draftConfig);
			this.state = completeSave(this.state, savedConfig);
		} catch (error) {
			this.state = failSave(
				this.state,
				error instanceof Error ? error.message : String(error)
			);
		}
		this.refresh();
	}

	private refresh(): void {
		this.tui.requestRender();
	}

	private close(): void {
		if (this.closed) {
			return;
		}
		this.closed = true;
		this.onClose();
	}
}

interface SettingsLayout {
	border: (text: string) => string;
	descW: number;
	headerLines: string[];
	innerW: number;
	keyW: number;
	line: (content?: string) => string;
}

function createLayout(
	theme: Theme,
	activeTab: SettingsTab,
	width: number
): SettingsLayout {
	const innerW = Math.max(MIN_WIDTH, width - 2);
	const compact = innerW < COMPACT_WIDTH;
	const keyW = compact ? 11 : 16;
	const descW = Math.max(8, innerW - keyW - 5);
	const border = (text: string) => theme.fg("muted", text);
	const title = theme.fg("muted", " @eko24ive/pi-ask ");
	const titleW = visibleWidth(title);
	const titlePad = Math.max(0, innerW - titleW);
	const left = Math.floor(titlePad / 2);
	const right = titlePad - left;
	const line = (content = "") =>
		`${border("│")}${padToWidth(` ${content}`, innerW)}${border("│")}`;

	return {
		border,
		descW,
		headerLines: [
			`${border(`╭${"─".repeat(left)}`)}${title}${border(`${"─".repeat(right)}╮`)}`,
			line(renderTabs(theme, activeTab, innerW - 1)),
			line(),
		],
		innerW,
		keyW,
		line,
	};
}

function renderBottomPanel(
	theme: Theme,
	state: AskSettingsState,
	layout: SettingsLayout
): string[] {
	const lines = [`${layout.border(`├${"─".repeat(layout.innerW)}┤`)}`];
	const notice = state.notice ?? getDefaultNotice(state);
	if (notice) {
		for (const noticeLine of wrapText(notice.text, layout.innerW - 2)) {
			lines.push(layout.line(colorNotice(theme, notice.kind, noticeLine)));
		}
	}
	for (const hintLine of wrapText(renderCloseHint(state), layout.innerW - 2)) {
		lines.push(layout.line(theme.fg("muted", hintLine)));
	}
	lines.push(`${layout.border(`╰${"─".repeat(layout.innerW)}╯`)}`);
	return lines;
}

function renderBehaviourTab(
	theme: Theme,
	state: AskSettingsState,
	layout: SettingsLayout
): string[] {
	return BEHAVIOUR_ROWS.flatMap((row, index) =>
		renderBehaviourRow(theme, state, layout, row, index)
	);
}

function renderBehaviourRow(
	theme: Theme,
	state: AskSettingsState,
	layout: SettingsLayout,
	row: (typeof BEHAVIOUR_ROWS)[number],
	index: number
): string[] {
	const focused = index === state.behaviourFocusIndex;
	const dirty =
		row.getValue(state.draftConfig) !== row.getValue(state.savedConfig);
	const checked = row.getValue(state.draftConfig);
	const marker = checked ? "[x]" : "[ ]";
	let labelColor: "warning" | "accent" | "text" = "text";
	if (dirty) {
		labelColor = "warning";
	} else if (focused) {
		labelColor = "accent";
	}
	let label = `${marker} ${row.label}`;
	label = theme.fg(labelColor, label);
	if (focused) {
		label = theme.bg("selectedBg", label);
	}

	const lines = [
		layout.line(truncateToWidth(label, layout.innerW - 1, "…")),
		...wrapText(row.description, layout.innerW - 4).map((descLine) =>
			layout.line(`   ${theme.fg("dim", descLine)}`)
		),
	];
	if (index < BEHAVIOUR_ROWS.length - 1) {
		lines.push(layout.line());
	}
	return lines;
}

function renderKeymapsTab(
	theme: Theme,
	layout: SettingsLayout,
	config: AskConfig,
	configPath: string,
	notice?: AskConfigNotice
): string[] {
	const lines: string[] = [];
	const compact = layout.innerW < COMPACT_WIDTH;
	const { customizable, fixed } = getAskKeymaps(config);
	const headerLines = [
		"Edit this config file to change customizable ask keymaps:",
		configPath,
		"Restart pi or run /reload after editing.",
	];

	for (const text of headerLines) {
		for (const line of wrapText(text, layout.innerW - 2)) {
			lines.push(
				layout.line(theme.fg(text === configPath ? "accent" : "dim", line))
			);
		}
	}
	if (notice?.kind === "error") {
		lines.push(layout.line());
		for (const line of wrapText(
			"Using default keymaps this session because configured keymaps were rejected.",
			layout.innerW - 2
		)) {
			lines.push(layout.line(theme.fg("warning", line)));
		}
	}
	lines.push(layout.line());
	lines.push(layout.line(theme.fg("muted", "Customizable")));
	pushKeymapRows(lines, theme, layout, customizable, compact);
	lines.push(
		layout.line(theme.fg("muted", "─".repeat(Math.max(1, layout.innerW - 2))))
	);
	lines.push(layout.line(theme.fg("muted", "Fixed")));
	pushKeymapRows(lines, theme, layout, fixed, compact);
	return lines;
}

function pushKeymapRows(
	lines: string[],
	theme: Theme,
	layout: SettingsLayout,
	keymaps: readonly AskKeyBinding[],
	compact: boolean
) {
	for (const hint of keymaps) {
		if (compact) {
			lines.push(layout.line(theme.fg("accent", hint.label)));
			for (const descLine of wrapText(hint.description, layout.innerW - 3)) {
				lines.push(layout.line(`  ${theme.fg("text", descLine)}`));
			}
			continue;
		}
		const keyText = padToWidth(
			truncateToWidth(hint.label, layout.keyW, "…"),
			layout.keyW
		);
		const key = theme.fg("accent", keyText);
		const desc = truncateToWidth(hint.description, layout.descW, "…");
		lines.push(layout.line(`${key} ${desc}`));
		const contexts = hint.contexts.join(", ");
		lines.push(
			layout.line(`${" ".repeat(layout.keyW)}  ${theme.fg("dim", contexts)}`)
		);
	}
}

function renderTabs(
	theme: Theme,
	activeTab: SettingsTab,
	width: number
): string {
	const renderTab = (tab: SettingsTab, label: string) => {
		const text = ` ${label} `;
		return activeTab === tab
			? theme.bg("selectedBg", theme.fg("accent", text))
			: theme.fg("muted", text);
	};

	const tabs = [
		renderTab("keymaps", "Keymaps"),
		renderTab("behaviour", "Behaviour"),
	].join(TAB_GAP);
	return truncateToWidth(tabs, width, "");
}

function colorNotice(
	theme: Theme,
	kind: AskConfigNotice["kind"],
	text: string
): string {
	switch (kind) {
		case "error":
			return theme.fg("error", text);
		case "success":
			return theme.fg("success", text);
		case "warning":
			return theme.fg("warning", text);
		default:
			return text;
	}
}

function getDefaultNotice(
	state: AskSettingsState
): AskConfigNotice | undefined {
	if (state.saving) {
		return { kind: "warning", text: "Saving…" };
	}
	if (isDirty(state)) {
		return {
			kind: "warning",
			text: "Unsaved changes. Press Ctrl+S to save.",
		};
	}
	return;
}

function renderCloseHint(state: AskSettingsState): string {
	if (isDirty(state)) {
		return "Ctrl+S save · Esc/Ctrl+C/? twice discard";
	}
	return "Esc, Ctrl+C, or ? close";
}

type MatchableKey = Parameters<typeof matchesKey>[1] | string;

function matchesAny(data: string, keys: readonly MatchableKey[]): boolean {
	return keys.some((key) => {
		if (key.length === 1) {
			return data === key;
		}
		return matchesKey(data, key as Parameters<typeof matchesKey>[1]);
	});
}
