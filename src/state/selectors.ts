import { OTHER_OPTION_LABEL, OTHER_OPTION_VALUE } from "../constants.ts";
import type {
	AskDisplayOption,
	AskQuestion,
	AskState,
	AskStateAnswer,
} from "../types.ts";
import { isAnswerAnswered } from "./answers.ts";

export function getCurrentQuestion(state: AskState): AskQuestion | undefined {
	return state.questions[state.activeTabIndex];
}

export function getQuestionById(
	state: AskState,
	questionId: string,
): AskQuestion | undefined {
	return state.questions.find((question) => question.id === questionId);
}

export function isSubmitTab(state: AskState): boolean {
	return state.activeTabIndex >= state.questions.length;
}

export function getRenderableOptions(
	question?: AskQuestion,
): AskDisplayOption[] {
	if (!question) {
		return [];
	}

	const options: AskDisplayOption[] = question.options.map((option) => ({
		...option,
	}));
	if (question.type !== "preview") {
		options.push({
			value: OTHER_OPTION_VALUE,
			label: OTHER_OPTION_LABEL,
			isCustomOption: true,
		});
	}
	return options;
}

export function getCurrentOption(
	state: AskState,
): AskDisplayOption | undefined {
	return getRenderableOptions(getCurrentQuestion(state))[
		state.activeOptionIndex
	];
}

export function getAnswer(
	state: AskState,
	questionId: string,
): AskStateAnswer | undefined {
	return state.answers[questionId];
}

export function getQuestionNote(
	state: AskState,
	questionId: string,
): string | undefined {
	return getAnswer(state, questionId)?.note;
}

export function getOptionNote(
	state: AskState,
	questionId: string,
	optionValue: string,
): string | undefined {
	return getAnswer(state, questionId)?.optionNotes?.[optionValue];
}

export function isQuestionAnswered(
	state: AskState,
	questionId: string,
): boolean {
	return isAnswerAnswered(getAnswer(state, questionId));
}

export function isQuestionNoteOpen(
	state: AskState,
	questionId: string,
): boolean {
	return (
		state.view.kind === "note" &&
		state.view.questionId === questionId &&
		state.view.optionValue === undefined
	);
}

export function isOptionNoteOpen(
	state: AskState,
	questionId: string,
	optionValue: string,
): boolean {
	return (
		state.view.kind === "note" &&
		state.view.questionId === questionId &&
		state.view.optionValue === optionValue
	);
}

export function isInputOpenForQuestion(
	state: AskState,
	questionId: string,
): boolean {
	return state.view.kind === "input" && state.view.questionId === questionId;
}
