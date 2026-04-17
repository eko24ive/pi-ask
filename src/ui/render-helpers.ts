import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import { NO_PREVIEW_TEXT } from "../constants.ts";
import { wrapText } from "../text.ts";
import { UI_DIMENSIONS, UI_TEXT } from "./constants.ts";

type Theme = ExtensionContext["ui"]["theme"];
type ThemeColor = "accent" | "muted" | "text" | "dim" | "success" | "warning";

export function pushWrappedText(
	lines: string[],
	text: string,
	width: number,
	theme: Theme,
	color: ThemeColor,
	prefix = "",
	continuationPrefix = prefix,
) {
	const availableWidth = Math.max(1, width - visibleWidth(prefix));
	const wrapped = wrapText(text, availableWidth);
	for (let index = 0; index < wrapped.length; index++) {
		const line = wrapped[index];
		const currentPrefix = index === 0 ? prefix : continuationPrefix;
		lines.push(
			truncateToWidth(`${currentPrefix}${theme.fg(color, line)}`, width),
		);
	}
	if (wrapped.length === 0) {
		lines.push(truncateToWidth(prefix, width));
	}
}

export function renderInputLine(
	line: string,
	availableWidth: number,
	theme: Theme,
): string {
	const innerWidth = Math.max(4, availableWidth - 2);
	const truncated = truncateToWidth(line, innerWidth);
	const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(truncated)));
	return theme.bg("toolPendingBg", ` ${truncated}${padding} `);
}

export function renderEditorBlock(args: {
	lines: string[];
	editorLines: string[];
	width: number;
	theme: Theme;
	indent: string;
	availableWidth: number;
	hint: string;
}) {
	const { lines, editorLines, width, theme, indent, availableWidth, hint } =
		args;
	for (const editorLine of editorLines) {
		lines.push(
			truncateToWidth(
				`${indent}${renderInputLine(editorLine, availableWidth, theme)}`,
				width,
			),
		);
	}
	lines.push(truncateToWidth(`${indent}${theme.fg("dim", hint)}`, width));
}

export function renderHint(template: string, newLineHint: string): string {
	return template.replace("{newLineHint}", newLineHint);
}

export function renderBox(
	content: Array<{ text: string; color: ThemeColor }>,
	width: number,
	theme: Theme,
): string[] {
	const boxWidth = Math.max(UI_DIMENSIONS.boxMinWidth, width);
	const innerWidth = Math.max(4, boxWidth - 2);
	const top = theme.fg("accent", `┌${"─".repeat(innerWidth)}┐`);
	const bottom = theme.fg("accent", `└${"─".repeat(innerWidth)}┘`);
	const lines = [top];
	for (const item of content) {
		for (const rawLine of wrapText(item.text, innerWidth)) {
			const line = theme.fg(item.color, rawLine);
			const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(line)));
			lines.push(
				theme.fg("accent", "│") + line + padding + theme.fg("accent", "│"),
			);
		}
	}
	lines.push(bottom);
	return lines;
}

export function renderPreviewPaneContent(
	selectedOption:
		| { label: string; description?: string; preview?: string }
		| undefined,
	theme: Theme,
	width: number,
): string[] {
	if (!selectedOption) {
		return renderBox([{ text: NO_PREVIEW_TEXT, color: "dim" }], width, theme);
	}

	const content: Array<{ text: string; color: ThemeColor }> = [
		{ text: selectedOption.label, color: "accent" },
	];
	if (selectedOption.description) {
		content.push({ text: selectedOption.description, color: "muted" });
	}
	content.push({ text: "", color: "dim" });
	for (const previewLine of (selectedOption.preview ?? NO_PREVIEW_TEXT).split(
		"\n",
	)) {
		content.push({
			text: previewLine,
			color: selectedOption.preview ? "text" : "dim",
		});
	}
	return renderBox(content, width, theme);
}

export function mergeColumns(
	left: string[],
	right: string[],
	leftWidth: number,
	width: number,
): string[] {
	const lines: string[] = [];
	const rowCount = Math.max(left.length, right.length);
	for (let index = 0; index < rowCount; index++) {
		const leftLine = left[index] ?? "";
		const rightLine = right[index] ?? "";
		const paddedLeft = padToVisibleWidth(leftLine, leftWidth);
		lines.push(truncateToWidth(`${paddedLeft}  ${rightLine}`, width));
	}
	return lines;
}

export function measurePreviewLeftWidth(
	options: Array<{ label: string; description?: string }>,
	width: number,
): number {
	let widest = 0;
	for (let index = 0; index < options.length; index++) {
		const option = options[index];
		widest = Math.max(
			widest,
			visibleWidth(`${index + 1}. ${option.label}`),
			option.description ? visibleWidth(option.description) : 0,
		);
	}

	const preferred = widest + 4;
	const maxWidth = Math.min(
		UI_DIMENSIONS.previewLeftMaxWidth,
		Math.floor(width * UI_DIMENSIONS.previewLeftRatio),
	);
	return clamp(
		preferred,
		UI_DIMENSIONS.previewLeftMinWidth,
		Math.max(UI_DIMENSIONS.previewLeftMinWidth, maxWidth),
	);
}

export function renderFooterText(
	mode: "input" | "note" | "submit" | "multi" | "default",
) {
	switch (mode) {
		case "input":
			return UI_TEXT.footerInput;
		case "note":
			return UI_TEXT.footerNote;
		case "submit":
			return UI_TEXT.footerSubmit;
		case "multi":
			return UI_TEXT.footerMulti;
		default:
			return UI_TEXT.footerDefault;
	}
}

function padToVisibleWidth(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
