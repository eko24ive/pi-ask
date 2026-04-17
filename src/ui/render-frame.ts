import { truncateToWidth } from "@mariozechner/pi-tui";
import {
	getCurrentQuestion,
	isQuestionAnswered,
	isSubmitTab,
} from "../state.ts";
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
	const footer = renderFooter(state, theme);
	if (footer) {
		add();
		add(footer);
	}
	add(theme.fg("accent", "─".repeat(Math.max(1, width))));
}

function renderTabs(state: AskState, theme: Theme, width: number): string {
	const segments: string[] = [theme.fg("dim", "← ")];
	for (let index = 0; index < state.questions.length; index++) {
		const question = state.questions[index];
		const active = state.activeTabIndex === index;
		const answered = isQuestionAnswered(state, question.id);
		const marker = answered ? "☒" : "☐";
		const text = ` ${marker} ${question.label} `;
		segments.push(
			active
				? theme.bg("selectedBg", theme.fg("text", text))
				: theme.fg(answered ? "success" : "muted", text),
		);
	}

	const submitText = " ✔ Submit ";
	segments.push(
		isSubmitTab(state)
			? theme.bg("selectedBg", theme.fg("text", submitText))
			: theme.fg("success", submitText),
	);
	segments.push(theme.fg("dim", " →"));
	return truncateToWidth(` ${segments.join(" ")}`, width);
}

function renderFooter(state: AskState, theme: Theme): string {
	if (state.view.kind === "input") {
		return theme.fg("dim", renderFooterText("input"));
	}
	if (state.view.kind === "note") {
		return theme.fg("dim", renderFooterText("note"));
	}
	if (isSubmitTab(state)) {
		return theme.fg("dim", renderFooterText("submit"));
	}
	const question = getCurrentQuestion(state);
	return theme.fg(
		"dim",
		renderFooterText(question?.type === "multi" ? "multi" : "default"),
	);
}
