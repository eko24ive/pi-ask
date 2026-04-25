import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
	getCurrentQuestion,
	isQuestionAnswered,
	isSubmitTab,
} from "../state/selectors.ts";
import { wrapText } from "../text.ts";
import type { AskState } from "../types.ts";
import { renderFooterText } from "./render-helpers.ts";
import type { Theme } from "./render-types.ts";

export function renderFrameHeader(args: {
	lines: string[];
	state: AskState;
	theme: Theme;
	width: number;
}) {
	const { lines, state, theme, width } = args;
	const add = (text = "") => lines.push(truncateToWidth(text, width));

	add(theme.fg("accent", "─".repeat(Math.max(1, width))));
	if (state.title) {
		add(` ${theme.fg("accent", theme.bold(state.title))}`);
		add();
	}
	add(renderTabs(state, theme, width));
	add();
}

export function renderFrameFooter(args: {
	lines: string[];
	state: AskState;
	theme: Theme;
	width: number;
}) {
	const { lines, state, theme, width } = args;
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	const footer = renderFooter(state, width);
	if (footer.length > 0) {
		add();
		for (const line of footer) {
			add(theme.fg("dim", line));
		}
	}
	add(theme.fg("accent", "─".repeat(Math.max(1, width))));
}

function renderTabs(state: AskState, theme: Theme, width: number): string {
	const tabs = state.questions.map((question, index) => {
		const active = state.activeTabIndex === index;
		const answered = isQuestionAnswered(state, question.id);
		const marker = answered ? "☒" : "☐";
		const text = ` ${marker} ${question.label} `;
		return {
			text,
			width: visibleWidth(text),
			render: active
				? theme.bg("selectedBg", theme.fg("text", text))
				: theme.fg(answered ? "success" : "muted", text),
		};
	});

	const submitText = " ✔ Submit ";
	tabs.push({
		text: submitText,
		width: visibleWidth(submitText),
		render: isSubmitTab(state)
			? theme.bg("selectedBg", theme.fg("text", submitText))
			: theme.fg("success", submitText),
	});

	const activeIndex = Math.min(state.activeTabIndex, tabs.length - 1);
	const { start, end } = getVisibleTabRange(
		tabs.map((tab) => tab.width),
		activeIndex,
		Math.max(1, width - 2)
	);
	const leftArrow = theme.fg("dim", "← ");
	const rightArrow = theme.fg("dim", " →");
	const visibleTabs = tabs
		.slice(start, end + 1)
		.map((tab) => tab.render)
		.join(" ");
	return truncateToWidth(` ${leftArrow}${visibleTabs}${rightArrow}`, width);
}

function getVisibleTabRange(
	widths: number[],
	activeIndex: number,
	availableWidth: number
): { start: number; end: number } {
	if (widths.length === 0) {
		return { start: 0, end: -1 };
	}

	const totalWidth =
		widths.reduce((sum, width) => sum + width, 0) +
		Math.max(0, widths.length - 1);
	if (totalWidth <= availableWidth) {
		return { start: 0, end: widths.length - 1 };
	}

	const zone = activeIndex / Math.max(1, widths.length - 1);
	const mode = getViewportMode(zone);
	return expandTabs(widths, activeIndex, availableWidth, mode);
}

function getViewportMode(zone: number): "left" | "right" | "balanced" {
	if (zone <= 0.33) {
		return "right";
	}
	if (zone >= 0.67) {
		return "left";
	}
	return "balanced";
}

function expandTabs(
	widths: number[],
	activeIndex: number,
	availableWidth: number,
	mode: "left" | "right" | "balanced"
): { start: number; end: number } {
	const range = { start: activeIndex, end: activeIndex };
	let usedWidth = widths[activeIndex] ?? 0;
	let preferRight = mode !== "left";

	while (true) {
		const directions = getGrowthDirections(mode, preferRight);
		const grew = directions.some((direction) => {
			const nextWidth = getNextTabWidth(widths, range, direction);
			if (
				nextWidth === undefined ||
				usedWidth + 1 + nextWidth > availableWidth
			) {
				return false;
			}
			usedWidth += 1 + nextWidth;
			growRange(range, direction);
			return true;
		});
		if (!grew) {
			return range;
		}
		if (mode === "balanced") {
			preferRight = !preferRight;
		}
	}
}

function getGrowthDirections(
	mode: "left" | "right" | "balanced",
	preferRight: boolean
): Array<"left" | "right"> {
	if (mode === "left") {
		return ["left", "right"];
	}
	if (mode === "right") {
		return ["right", "left"];
	}
	return preferRight ? ["right", "left"] : ["left", "right"];
}

function getNextTabWidth(
	widths: number[],
	range: { start: number; end: number },
	direction: "left" | "right"
): number | undefined {
	if (direction === "left") {
		return widths[range.start - 1];
	}
	return widths[range.end + 1];
}

function growRange(
	range: { start: number; end: number },
	direction: "left" | "right"
) {
	if (direction === "left") {
		range.start -= 1;
		return;
	}
	range.end += 1;
}

function renderFooter(state: AskState, width: number): string[] {
	let footer: string;
	if (state.view.kind === "input") {
		footer = renderFooterText("input");
	} else if (state.view.kind === "note") {
		footer = renderFooterText("note");
	} else if (isSubmitTab(state)) {
		footer = renderFooterText("submit");
	} else {
		const question = getCurrentQuestion(state);
		footer = renderFooterText(question?.type === "multi" ? "multi" : "default");
	}
	return wrapFooterHints(footer, width);
}

function wrapFooterHints(footer: string, width: number): string[] {
	return footer.split(" · ").reduce<string[]>((lines, chunk) => {
		const current = lines.at(-1) ?? "";
		const next = current ? `${current} · ${chunk}` : chunk;
		const fitsCurrentLine = visibleWidth(next) <= width;
		if (fitsCurrentLine) {
			if (current) {
				lines[lines.length - 1] = next;
			} else {
				lines.push(next);
			}
			return lines;
		}

		const wrappedChunk = wrapText(chunk, width);
		if (!current) {
			lines.push(...wrappedChunk);
			return lines;
		}
		lines.push(...wrappedChunk);
		return lines;
	}, []);
}
