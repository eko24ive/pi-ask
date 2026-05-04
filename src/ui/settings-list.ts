import {
	Key,
	matchesKey,
	truncateToWidth,
	visibleWidth,
	wrapTextWithAnsi,
} from "@mariozechner/pi-tui";
import type { AskConfig } from "../config/schema.ts";
import type { AskConfigNotice } from "../config/store.ts";

interface Theme {
	bg(color: string, text: string): string;
	fg(color: string, text: string): string;
}

interface TuiLike {
	requestRender(): void;
}

interface AskSettingsListOptions {
	configPath: string;
	notice?: AskConfigNotice;
	onClose: () => void;
	onSave: (config: AskConfig) => Promise<AskConfig>;
	savedConfig: AskConfig;
	tui: TuiLike;
}

const DESCRIPTION_LINE_COUNT = 3;
const COMPACT_WIDTH = 40;

const SETTINGS = [
	{
		description:
			"Auto-submit completed ask flows when no question or option notes were added.",
		key: "autoSubmitWhenAnsweredWithoutNotes",
		label: "Auto-submit when answered without notes",
	},
	{
		description:
			"Require a second cancel or dismiss action before discarding answered or drafted ask content.",
		key: "confirmDismissWhenDirty",
		label: "Confirm dismiss when dirty",
	},
	{
		description:
			"Require pressing 1, 2, or 3 twice on the review tab before triggering Submit, Elaborate, or Cancel.",
		key: "doublePressReviewShortcuts",
		label: "Double-press review shortcuts",
	},
	{
		description:
			"Emit one external notification when the ask flow opens and waits for input.",
		key: "notifications.enabled",
		label: "Notifications",
	},
	{
		description: "Show footer keymap hints at the bottom of the ask flow.",
		key: "showFooterHints",
		label: "Show footer hints",
	},
] as const;

type SettingKey = (typeof SETTINGS)[number]["key"];

export class AskSettingsList {
	private closed = false;
	private config: AskConfig;
	private error?: string;
	private focusIndex = 0;
	private readonly configPath: string;
	private readonly notice?: AskConfigNotice;
	private readonly onClose: () => void;
	private readonly onSave: (config: AskConfig) => Promise<AskConfig>;
	private readonly theme: Theme;
	private readonly tui: TuiLike;

	constructor(theme: Theme, options: AskSettingsListOptions) {
		this.theme = theme;
		this.config = options.savedConfig;
		this.configPath = options.configPath;
		this.notice = options.notice;
		this.onClose = options.onClose;
		this.onSave = options.onSave;
		this.tui = options.tui;
	}

	handleInput(data: string): void {
		if (
			data === "?" ||
			matchesKey(data, Key.ctrl("c")) ||
			matchesKey(data, Key.escape)
		) {
			this.close();
			return;
		}
		if (matchesKey(data, Key.up)) {
			this.focusIndex =
				this.focusIndex === 0 ? SETTINGS.length - 1 : this.focusIndex - 1;
			this.tui.requestRender();
			return;
		}
		if (matchesKey(data, Key.down)) {
			this.focusIndex = (this.focusIndex + 1) % SETTINGS.length;
			this.tui.requestRender();
			return;
		}
		if (matchesKey(data, Key.enter) || data === " ") {
			const setting = SETTINGS[this.focusIndex];
			if (setting) {
				this.saveSetting(setting.key, !this.getSettingValue(setting.key));
				this.tui.requestRender();
			}
		}
	}

	render(width: number): string[] {
		const innerWidth = Math.max(24, width - 2);
		const lines = [
			this.topBorder(innerWidth),
			this.line(
				center(this.theme.fg("accent", "@eko24ive/pi-ask"), innerWidth),
				innerWidth
			),
			this.line("", innerWidth),
		];

		this.appendWrapped(
			lines,
			this.theme.fg(
				"muted",
				"Edit this config file to customize keymaps, notifications, and extraction settings:"
			),
			innerWidth
		);
		this.appendWrapped(
			lines,
			this.theme.fg("accent", this.configPath),
			innerWidth,
			{
				center: true,
			}
		);

		lines.push(this.line("", innerWidth));
		for (const [index, setting] of SETTINGS.entries()) {
			for (const settingLine of this.renderSetting(
				setting,
				index,
				innerWidth
			)) {
				lines.push(this.line(settingLine, innerWidth));
			}
			if (innerWidth < COMPACT_WIDTH && index < SETTINGS.length - 1) {
				lines.push(this.line("", innerWidth));
			}
		}

		this.appendSelectedDescription(lines, innerWidth);
		this.appendNotice(lines, innerWidth);

		lines.push(this.line("", innerWidth));
		this.appendFooter(lines, innerWidth);
		lines.push(this.bottomBorder(innerWidth));
		return lines.map((line) => truncateToWidth(line, width));
	}

	invalidate(): void {
		// State-driven component; nothing cached across theme changes.
	}

	dispose(): void {
		this.close();
	}

	private appendFooter(lines: string[], innerWidth: number): void {
		if (innerWidth < COMPACT_WIDTH) {
			lines.push(
				this.line(this.theme.fg("dim", " Enter/Space to change"), innerWidth)
			);
			lines.push(this.line(this.theme.fg("dim", " Esc to close"), innerWidth));
			return;
		}
		this.appendWrapped(
			lines,
			this.theme.fg("dim", "Enter/Space to change · Esc to close"),
			innerWidth
		);
	}

	private appendSelectedDescription(lines: string[], innerWidth: number): void {
		const selectedSetting = SETTINGS[this.focusIndex];
		if (!selectedSetting) {
			return;
		}
		lines.push(this.line("", innerWidth));
		const descriptionLines = wrapTextWithAnsi(
			this.theme.fg("muted", selectedSetting.description),
			innerWidth - 2
		).slice(0, DESCRIPTION_LINE_COUNT);
		for (const line of descriptionLines) {
			lines.push(this.line(` ${line}`, innerWidth));
		}
		for (
			let index = descriptionLines.length;
			index < DESCRIPTION_LINE_COUNT;
			index++
		) {
			lines.push(this.line("", innerWidth));
		}
	}

	private appendNotice(lines: string[], innerWidth: number): void {
		if (this.notice?.kind === "error") {
			lines.push(this.line("", innerWidth));
			this.appendWrapped(
				lines,
				this.theme.fg("warning", this.notice.text),
				innerWidth
			);
		}
		if (this.error) {
			lines.push(this.line("", innerWidth));
			this.appendWrapped(lines, this.theme.fg("error", this.error), innerWidth);
		}
	}

	private appendWrapped(
		lines: string[],
		content: string,
		innerWidth: number,
		options: { center?: boolean } = {}
	): void {
		for (const line of wrapTextWithAnsi(content, innerWidth - 2)) {
			const contentLine = options.center
				? center(line, innerWidth)
				: ` ${line}`;
			lines.push(this.line(contentLine, innerWidth));
		}
	}

	private renderSetting(
		setting: (typeof SETTINGS)[number],
		index: number,
		innerWidth: number
	): string[] {
		const selected = index === this.focusIndex;
		const prefix = selected ? this.theme.fg("accent", "❯ ") : "  ";
		const continuationPrefix = "  ";
		const enabled = this.getSettingValue(setting.key);
		const value = this.renderValue(enabled, selected);
		const valueWidth = enabled ? 4 : 5;
		const labelWidth = Math.max(
			1,
			innerWidth - visibleWidth(prefix) - valueWidth - 2
		);
		const labelLines = wrapTextWithAnsi(setting.label, labelWidth);
		const firstLabelLine = labelLines[0] ?? "";
		const gap = " ".repeat(
			Math.max(1, labelWidth - visibleWidth(firstLabelLine) + 1)
		);
		const firstLine = `${prefix}${firstLabelLine}${gap}${value}`;
		const continuationLines = labelLines
			.slice(1)
			.map((line) => `${continuationPrefix}${line}`);
		return [firstLine, ...continuationLines];
	}

	private renderValue(enabled: boolean, selected: boolean): string {
		const value = enabled ? "on" : "off";
		const styledValue = selected
			? this.theme.bg("selectedBg", this.theme.fg("accent", value))
			: this.theme.fg("muted", value);
		return `${this.theme.fg("dim", "[")}${styledValue}${this.theme.fg("dim", "]")}`;
	}

	private getSettingValue(key: SettingKey): boolean {
		return key === "notifications.enabled"
			? this.config.notifications.enabled
			: this.config.behaviour[key];
	}

	private saveSetting(key: SettingKey, enabled: boolean): void {
		this.error = undefined;
		const previousConfig = this.config;
		const nextConfig =
			key === "notifications.enabled"
				? {
						...this.config,
						notifications: {
							...this.config.notifications,
							enabled,
						},
					}
				: {
						...this.config,
						behaviour: {
							...this.config.behaviour,
							[key]: enabled,
						},
					};
		this.config = nextConfig;
		this.onSave(nextConfig)
			.then((savedConfig) => {
				this.config = savedConfig;
				this.tui.requestRender();
			})
			.catch((error: unknown) => {
				this.config = previousConfig;
				this.error = error instanceof Error ? error.message : String(error);
				this.tui.requestRender();
			});
	}

	private topBorder(innerWidth: number): string {
		return this.theme.fg("muted", `╭${"─".repeat(innerWidth)}╮`);
	}

	private bottomBorder(innerWidth: number): string {
		return this.theme.fg("muted", `╰${"─".repeat(innerWidth)}╯`);
	}

	private line(content: string, innerWidth: number): string {
		const clipped = truncateToWidth(content, innerWidth, "…");
		return `${this.theme.fg("muted", "│")}${padToWidth(clipped, innerWidth)}${this.theme.fg("muted", "│")}`;
	}

	private close(): void {
		if (this.closed) {
			return;
		}
		this.closed = true;
		this.onClose();
	}
}

function center(text: string, width: number): string {
	const padding = Math.max(0, width - visibleWidth(text));
	const left = Math.floor(padding / 2);
	const right = padding - left;
	return `${" ".repeat(left)}${text}${" ".repeat(right)}`;
}

function padToWidth(text: string, width: number): string {
	return `${text}${" ".repeat(Math.max(0, width - visibleWidth(text)))}`;
}
