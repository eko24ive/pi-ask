import { truncateToWidth } from "@mariozechner/pi-tui";
import { SUBMIT_CHOICES } from "../constants.ts";
import { toAskResult } from "../state.ts";
import type { AskResult, AskState } from "../types.ts";
import { UI_TEXT } from "./constants.ts";
import { pushWrappedText } from "./render-helpers.ts";
import type { Theme } from "./render-types.ts";

export function renderSubmitScreen(
	lines: string[],
	state: AskState,
	theme: Theme,
	width: number,
) {
	pushWrappedText(lines, UI_TEXT.reviewTitle, width, theme, "accent", " ", " ");
	lines.push("");

	const submittedAnswers = toAskResult(state).answers;
	for (const question of state.questions) {
		renderSubmittedQuestion(
			lines,
			question,
			submittedAnswers[question.id],
			theme,
			width,
		);
	}

	lines.push("");
	pushWrappedText(
		lines,
		UI_TEXT.readyToSubmit,
		width,
		theme,
		"success",
		" ",
		" ",
	);
	lines.push("");
	renderSubmitActions(lines, state, theme, width);
}

function renderSubmittedQuestion(
	lines: string[],
	question: AskState["questions"][number],
	answer: AskResult["answers"][string] | undefined,
	theme: Theme,
	width: number,
) {
	pushWrappedText(lines, question.prompt, width, theme, "muted", " ● ", "   ");
	if (!answer) {
		lines.push(
			truncateToWidth(`   ${theme.fg("warning", UI_TEXT.unanswered)}`, width),
		);
		return;
	}

	renderSubmittedAnswer(lines, answer, theme, width);
}

function renderSubmittedAnswer(
	lines: string[],
	answer: AskResult["answers"][string],
	theme: Theme,
	width: number,
) {
	const answerText = answer.customText ?? answer.labels.join(", ");
	if (answerText) {
		pushWrappedText(
			lines,
			`→ ${answerText}`,
			width,
			theme,
			answer.customText ? "text" : "success",
			"   ",
			"     ",
		);
	}
	if (answer.note) {
		pushWrappedText(
			lines,
			`Question note: ${answer.note}`,
			width,
			theme,
			"muted",
			"   ",
			"     ",
		);
	}
	for (let index = 0; index < answer.values.length; index++) {
		const value = answer.values[index];
		const label = answer.labels[index] ?? value;
		const note = answer.optionNotes?.[value];
		if (!note) {
			continue;
		}
		pushWrappedText(
			lines,
			`${label} note: ${note}`,
			width,
			theme,
			"muted",
			"   ",
			"     ",
		);
	}
}

function renderSubmitActions(
	lines: string[],
	state: AskState,
	theme: Theme,
	width: number,
) {
	for (let index = 0; index < SUBMIT_CHOICES.length; index++) {
		const selected = index === state.activeSubmitActionIndex;
		const prefix = selected ? "❯ " : "  ";
		pushWrappedText(
			lines,
			`${index + 1}. ${SUBMIT_CHOICES[index]}`,
			width,
			theme,
			selected ? "accent" : "text",
			prefix,
			prefix,
		);
	}
}
