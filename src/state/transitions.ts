import type { AskAction, AskState } from "../types.ts";
import {
	emptyAnswer,
	isAnswerAnswered,
	isAnswerEmpty,
	saveCustomText,
	saveOptionNote,
	saveQuestionNote,
	setSingleSelection,
	toggleSelection,
} from "./answers.ts";
import {
	getAnswer,
	getCurrentOption,
	getCurrentQuestion,
	getQuestionById,
	getRenderableOptions,
	isSubmitTab,
} from "./selectors.ts";
import {
	inputView,
	isEditingView,
	navigateView,
	optionNoteView,
	questionNoteView,
	submitView,
} from "./view.ts";

const SUBMIT_ACTION_COUNT = 2;

export function createInitialState(params: {
	title?: string;
	questions: AskState["questions"];
}): AskState {
	return {
		title: params.title,
		questions: params.questions,
		activeTabIndex: 0,
		activeOptionIndex: 0,
		activeSubmitActionIndex: 0,
		view: navigateView(),
		answers: {},
		completed: false,
		cancelled: false,
	};
}

export function reduceAskState(state: AskState, action: AskAction): AskState {
	switch (action.type) {
		case "MOVE_TAB":
			return moveTabBy(state, action.delta);
		case "MOVE_OPTION":
			return moveOptionBy(state, action.delta);
		case "OPEN_INPUT":
			return setView(state, inputView(action.questionId));
		case "OPEN_QUESTION_NOTE":
			return setView(state, questionNoteView(action.questionId));
		case "OPEN_OPTION_NOTE":
			return setView(
				state,
				optionNoteView(action.questionId, action.optionValue),
			);
		case "CONFIRM":
			return confirmCurrentSelection(state);
		case "TOGGLE_MULTI":
			return toggleCurrentMultiOption(state);
		case "NUMBER_SHORTCUT":
			return applyNumberShortcut(state, action.digit);
		case "SAVE_INPUT":
			return saveInputValue(state, action.value, action.submit ?? false);
		case "SAVE_NOTE":
			return saveNoteValue(state, action.value);
		case "CANCEL":
			return cancelFlow(state);
		default:
			return state;
	}
}

export function moveTab(state: AskState, delta: number): AskState {
	return reduceAskState(state, {
		type: "MOVE_TAB",
		delta: delta < 0 ? -1 : 1,
	});
}

export function moveOption(state: AskState, delta: number): AskState {
	return reduceAskState(state, {
		type: "MOVE_OPTION",
		delta: delta < 0 ? -1 : 1,
	});
}

export function enterInputMode(state: AskState, questionId: string): AskState {
	return reduceAskState(state, { type: "OPEN_INPUT", questionId });
}

export function enterQuestionNoteMode(
	state: AskState,
	questionId: string,
): AskState {
	return reduceAskState(state, { type: "OPEN_QUESTION_NOTE", questionId });
}

export function enterOptionNoteMode(
	state: AskState,
	questionId: string,
	optionValue: string,
): AskState {
	return reduceAskState(state, {
		type: "OPEN_OPTION_NOTE",
		questionId,
		optionValue,
	});
}

export function toggleCurrentMultiOption(state: AskState): AskState {
	const question = getCurrentQuestion(state);
	if (!question || question.type === "single") {
		return state;
	}

	const option = getCurrentOption(state);
	if (!option) {
		return state;
	}
	if (option.isCustomOption) {
		return setView(state, inputView(question.id));
	}

	return updateAnswer(state, question.id, (answer) =>
		toggleSelection(answer, option, state.activeOptionIndex),
	);
}

export function confirmCurrentSelection(state: AskState): AskState {
	if (isSubmitTab(state)) {
		return state.activeSubmitActionIndex === 1
			? { ...state, cancelled: true, completed: true }
			: { ...state, completed: true };
	}

	const question = getCurrentQuestion(state);
	const option = getCurrentOption(state);
	if (!question || !option) {
		return state;
	}

	if (question.type === "multi") {
		if (option.isCustomOption) {
			return setView(state, inputView(question.id));
		}
		return advanceToNextTab(state);
	}

	if (option.isCustomOption) {
		return setView(state, inputView(question.id));
	}

	const nextState = updateAnswer(state, question.id, (answer) =>
		setSingleSelection(answer, option, state.activeOptionIndex),
	);
	return advanceToNextTab(nextState);
}

export function applyNumberShortcut(state: AskState, digit: number): AskState {
	if (digit <= 0 || isSubmitTab(state)) {
		return state;
	}

	const question = getCurrentQuestion(state);
	if (!question) {
		return state;
	}

	const index = digit - 1;
	const option = getRenderableOptions(question)[index];
	if (!option) {
		return state;
	}

	const selectedState = { ...state, activeOptionIndex: index };
	if (option.isCustomOption) {
		return setView(selectedState, inputView(question.id));
	}

	if (question.type === "multi") {
		return updateAnswer(selectedState, question.id, (answer) =>
			toggleSelection(answer, option, index),
		);
	}

	const nextState = updateAnswer(selectedState, question.id, (answer) =>
		setSingleSelection(answer, option, index),
	);
	return advanceToNextTab(nextState);
}

export function saveCustomAnswer(state: AskState, rawValue: string): AskState {
	return saveInputValue(state, rawValue, false);
}

export function submitCustomAnswer(
	state: AskState,
	rawValue: string,
): AskState {
	return saveInputValue(state, rawValue, true);
}

export function saveNote(state: AskState, rawValue: string): AskState {
	return saveNoteValue(state, rawValue);
}

export function cancelFlow(state: AskState): AskState {
	if (isEditingView(state)) {
		return exitEditingView(state);
	}
	return {
		...state,
		cancelled: true,
		completed: true,
	};
}

function saveInputValue(
	state: AskState,
	rawValue: string,
	submit: boolean,
): AskState {
	if (state.view.kind !== "input") {
		return state;
	}

	const question = getQuestionById(state, state.view.questionId);
	if (!question) {
		return exitEditingView(state);
	}

	const nextState = updateAnswer(
		exitEditingView(state),
		question.id,
		(answer) => saveCustomText(answer, rawValue),
	);
	if (!submit || !isAnswerAnswered(nextState.answers[question.id])) {
		return nextState;
	}
	return advanceToNextTab(nextState);
}

function saveNoteValue(state: AskState, rawValue: string): AskState {
	if (state.view.kind !== "note") {
		return exitEditingView(state);
	}

	const { questionId, optionValue } = state.view;
	const nextState = updateAnswer(
		exitEditingView(state),
		questionId,
		(answer) =>
			optionValue
				? saveOptionNote(answer, optionValue, rawValue)
				: saveQuestionNote(answer, rawValue),
	);
	return nextState;
}

function moveTabBy(state: AskState, delta: 1 | -1): AskState {
	const totalTabs = state.questions.length + 1;
	const activeTabIndex = (state.activeTabIndex + delta + totalTabs) % totalTabs;
	return {
		...state,
		activeTabIndex,
		activeOptionIndex: 0,
		activeSubmitActionIndex: 0,
		view:
			activeTabIndex >= state.questions.length ? submitView() : navigateView(),
	};
}

function moveOptionBy(state: AskState, delta: 1 | -1): AskState {
	if (isSubmitTab(state)) {
		return {
			...state,
			activeSubmitActionIndex: clamp(
				state.activeSubmitActionIndex + delta,
				0,
				SUBMIT_ACTION_COUNT - 1,
			),
		};
	}

	const options = getRenderableOptions(getCurrentQuestion(state));
	return {
		...state,
		activeOptionIndex: clamp(
			state.activeOptionIndex + delta,
			0,
			Math.max(0, options.length - 1),
		),
	};
}

function setView(state: AskState, view: AskState["view"]): AskState {
	return {
		...state,
		view,
	};
}

function exitEditingView(state: AskState): AskState {
	return {
		...state,
		view: isSubmitTab(state) ? submitView() : navigateView(),
	};
}

function advanceToNextTab(state: AskState): AskState {
	const nextTab = Math.min(state.activeTabIndex + 1, state.questions.length);
	return {
		...state,
		activeTabIndex: nextTab,
		activeOptionIndex: 0,
		activeSubmitActionIndex: 0,
		view: nextTab === state.questions.length ? submitView() : navigateView(),
	};
}

function updateAnswer(
	state: AskState,
	questionId: string,
	mutate: (
		answer: ReturnType<typeof emptyAnswer>,
	) => ReturnType<typeof emptyAnswer>,
): AskState {
	const existing = getAnswer(state, questionId) ?? emptyAnswer();
	const nextAnswer = mutate(existing);
	const answers = { ...state.answers };
	if (isAnswerEmpty(nextAnswer)) {
		delete answers[questionId];
	} else {
		answers[questionId] = nextAnswer;
	}
	return {
		...state,
		answers,
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
