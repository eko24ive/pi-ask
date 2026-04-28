import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
	ASK_HELP_CLOSE_BINDINGS,
	ASK_HELP_CLOSE_HINT,
	ASK_KEY_BINDINGS,
	ASK_KEYMAPS,
	matchesBinding,
} from "../constants/keymaps.ts";
import { wrapText } from "../text.ts";

type SettingsTab = "keymaps" | "behaviour";

interface Theme {
	bg(color: string, text: string): string;
	fg(color: string, text: string): string;
}

const MIN_WIDTH = 24;
const COMPACT_WIDTH = 46;
const TAB_GAP = "  ";

function padToWidth(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

export class AskSettingsModal {
	private activeTab: SettingsTab = "keymaps";
	private closed = false;
	private readonly onClose: () => void;
	private readonly theme: Theme;

	constructor(theme: Theme, onClose: () => void) {
		this.theme = theme;
		this.onClose = onClose;
	}

	handleInput(data: string): void {
		if (
			ASK_HELP_CLOSE_BINDINGS.some((binding) => matchesBinding(data, binding))
		) {
			this.close();
			return;
		}
		if (matchesBinding(data, ASK_KEY_BINDINGS.nextTab)) {
			this.activeTab = this.activeTab === "keymaps" ? "behaviour" : "keymaps";
			return;
		}
		if (matchesBinding(data, ASK_KEY_BINDINGS.previousTab)) {
			this.activeTab = this.activeTab === "behaviour" ? "keymaps" : "behaviour";
		}
	}

	render(width: number): string[] {
		const layout = createLayout(this.theme, this.activeTab, width);
		const lines = [...layout.headerLines];

		if (this.activeTab === "keymaps") {
			lines.push(...renderKeymapsTab(this.theme, layout));
		} else {
			lines.push(...renderBehaviourTab(this.theme, layout));
		}

		lines.push(`${layout.border(`├${"─".repeat(layout.innerW)}┤`)}`);
		for (const hintLine of wrapText(ASK_HELP_CLOSE_HINT, layout.innerW - 2)) {
			lines.push(layout.line(this.theme.fg("muted", hintLine)));
		}
		lines.push(`${layout.border(`╰${"─".repeat(layout.innerW)}╯`)}`);
		return lines;
	}

	invalidate(): void {
		// Static modal; no async invalidation needed.
	}

	dispose(): void {
		this.close();
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
	const border = (text: string) => theme.fg("border", text);
	const title = theme.fg("accent", " @eko24ive/pi-ask ");
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

function renderKeymapsTab(theme: Theme, layout: SettingsLayout): string[] {
	const lines: string[] = [];
	const compact = layout.innerW < COMPACT_WIDTH;

	for (const hint of ASK_KEYMAPS) {
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

	return lines;
}

function renderBehaviourTab(theme: Theme, layout: SettingsLayout): string[] {
	return wrapText("Behaviour settings coming soon.", layout.innerW - 2).map(
		(settingsLine) => layout.line(theme.fg("muted", settingsLine))
	);
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
