import type {
	AskAnswer,
	AskParams,
	AskQuestion,
	AskQuestionInput,
	AskResult,
	AskState,
	RenderOption,
} from "./types.ts";

const OTHER_VALUE = "__other__";

export function normalizeQuestions(params: AskParams): AskQuestion[] {
	return params.questions.map((question, index) =>
		normalizeQuestion(question, index),
	);
}

function normalizeQuestion(
	question: AskQuestionInput,
	index: number,
): AskQuestion {
	return {
		...question,
		label: question.label?.trim() || `Q${index + 1}`,
		type: question.type ?? "single",
		allowOther: question.allowOther !== false,
		required: question.required !== false,
	};
}

export function createInitialState(params: AskParams): AskState {
	return {
		title: params.title,
		questions: normalizeQuestions(params),
		currentTab: 0,
		optionIndex: 0,
		submitIndex: 0,
		mode: "navigate",
		inputQuestionId: null,
		answers: {},
		completed: false,
		cancelled: false,
	};
}

export function getCurrentQuestion(state: AskState): AskQuestion | undefined {
	return state.questions[state.currentTab];
}

export function isSubmitTab(state: AskState): boolean {
	return state.currentTab >= state.questions.length;
}

export function getRenderableOptions(question?: AskQuestion): RenderOption[] {
	if (!question) {
		return [];
	}
	const options: RenderOption[] = [...question.options];
	if (question.type !== "preview" && question.allowOther) {
		options.push({
			value: OTHER_VALUE,
			label: "Type your own",
			isOther: true,
		});
	}
	return options;
}

export function getAnswer(
	state: AskState,
	questionId: string,
): AskAnswer | undefined {
	return state.answers[questionId];
}

export function isQuestionAnswered(
	state: AskState,
	questionId: string,
): boolean {
	const answer = state.answers[questionId];
	return !!answer && answer.labels.length > 0;
}

export function moveTab(state: AskState, delta: number): AskState {
	const totalTabs = state.questions.length + 1;
	const currentTab = (state.currentTab + delta + totalTabs) % totalTabs;
	return {
		...state,
		currentTab,
		optionIndex: 0,
		submitIndex: 0,
		mode: isSubmitTab({ ...state, currentTab }) ? "submit" : "navigate",
		inputQuestionId: null,
	};
}

export function moveOption(state: AskState, delta: number): AskState {
	if (isSubmitTab(state)) {
		return {
			...state,
			submitIndex: clamp(state.submitIndex + delta, 0, 1),
		};
	}

	const options = getRenderableOptions(getCurrentQuestion(state));
	return {
		...state,
		optionIndex: clamp(
			state.optionIndex + delta,
			0,
			Math.max(0, options.length - 1),
		),
	};
}

export function enterInputMode(state: AskState, questionId: string): AskState {
	return {
		...state,
		mode: "input",
		inputQuestionId: questionId,
	};
}

export function exitInputMode(state: AskState): AskState {
	return {
		...state,
		mode: isSubmitTab(state) ? "submit" : "navigate",
		inputQuestionId: null,
	};
}

export function toggleCurrentMultiOption(state: AskState): AskState {
	const question = getCurrentQuestion(state);
	if (!question || question.type === "single") return state;

	const options = getRenderableOptions(question);
	const option = options[state.optionIndex];
	if (!option) return state;
	if (option.isOther) {
		return enterInputMode(state, question.id);
	}
	return toggleAnswer(state, question.id, option, state.optionIndex);
}

export function confirmCurrentSelection(state: AskState): AskState {
	if (isSubmitTab(state)) {
		if (state.submitIndex === 1) {
			return { ...state, cancelled: true, completed: true };
		}
		return { ...state, completed: true };
	}

	const question = getCurrentQuestion(state);
	if (!question) return state;

	if (question.type === "multi") {
		const currentOption = getRenderableOptions(question)[state.optionIndex];
		if (currentOption?.isOther) {
			return enterInputMode(state, question.id);
		}
		return advanceToNextTab(state);
	}

	const option = getRenderableOptions(question)[state.optionIndex];
	if (!option) return state;
	if (option.isOther) {
		return enterInputMode(state, question.id);
	}
	const nextState = setSingleAnswer(
		state,
		question.id,
		option,
		state.optionIndex,
	);
	return advanceToNextTab(nextState);
}

export function applyNumberShortcut(state: AskState, digit: number): AskState {
	if (digit <= 0 || isSubmitTab(state)) return state;

	const question = getCurrentQuestion(state);
	if (!question) return state;

	const options = getRenderableOptions(question);
	const index = digit - 1;
	const option = options[index];
	if (!option) return state;

	const selectedState = { ...state, optionIndex: index };
	if (option.isOther) {
		return enterInputMode(selectedState, question.id);
	}
	if (question.type === "multi") {
		return toggleAnswer(selectedState, question.id, option, index);
	}
	const nextState = setSingleAnswer(selectedState, question.id, option, index);
	return advanceToNextTab(nextState);
}

export function saveCustomAnswer(state: AskState, rawValue: string): AskState {
	const question = state.questions.find(
		(item) => item.id === state.inputQuestionId,
	);
	if (!question) return exitInputMode(state);

	const trimmed = rawValue.trim();
	const nextState = exitInputMode(state);
	if (!trimmed) {
		const answers = { ...nextState.answers };
		delete answers[question.id];
		return {
			...nextState,
			answers,
		};
	}

	const answer: AskAnswer = {
		values: [rawValue],
		labels: [rawValue],
		indices: [],
		customText: rawValue,
	};
	return {
		...nextState,
		answers: {
			...nextState.answers,
			[question.id]: answer,
		},
	};
}

export function submitCustomAnswer(
	state: AskState,
	rawValue: string,
): AskState {
	const questionId = state.inputQuestionId;
	const nextState = saveCustomAnswer(state, rawValue);
	if (!questionId || !getAnswer(nextState, questionId)) {
		return nextState;
	}
	return advanceToNextTab(nextState);
}

export function cancelFlow(state: AskState): AskState {
	if (state.mode === "input") {
		return exitInputMode(state);
	}
	return {
		...state,
		cancelled: true,
		completed: true,
	};
}

export function toAskResult(state: AskState): AskResult {
	return {
		title: state.title,
		cancelled: state.cancelled,
		questions: state.questions.map((question) => ({
			id: question.id,
			label: question.label,
			prompt: question.prompt,
			type: question.type,
		})),
		answers: state.answers,
	};
}

export function summarizeResult(result: AskResult): string {
	if (result.cancelled) {
		return "User cancelled the ask flow";
	}

	const lines = result.questions.flatMap((question) => {
		const answer = result.answers[question.id];
		if (!answer) return [];
		if (answer.customText) {
			return [`${question.label}: ${answer.customText}`];
		}
		return [`${question.label}: ${answer.labels.join(", ")}`];
	});

	return lines.join("\n") || "User submitted the ask flow";
}

function toggleAnswer(
	state: AskState,
	questionId: string,
	option: RenderOption,
	index: number,
): AskState {
	const existing = state.answers[questionId] ?? emptyAnswer();
	const next = cloneAnswer(existing);
	const foundIndex = next.values.indexOf(option.value);

	if (foundIndex >= 0) {
		next.values.splice(foundIndex, 1);
		next.labels.splice(foundIndex, 1);
		next.indices.splice(foundIndex, 1);
	} else {
		next.values.push(option.value);
		next.labels.push(option.label);
		next.indices.push(index + 1);
	}

	return {
		...state,
		answers: {
			...state.answers,
			[questionId]: next,
		},
	};
}

function setSingleAnswer(
	state: AskState,
	questionId: string,
	option: RenderOption,
	index: number,
): AskState {
	return {
		...state,
		answers: {
			...state.answers,
			[questionId]: {
				values: [option.value],
				labels: [option.label],
				indices: [index + 1],
			},
		},
	};
}

function advanceToNextTab(state: AskState): AskState {
	const totalQuestions = state.questions.length;
	if (totalQuestions === 1) {
		return {
			...state,
			currentTab: totalQuestions,
			mode: "submit",
			optionIndex: 0,
			submitIndex: 0,
			inputQuestionId: null,
		};
	}

	const nextTab = Math.min(state.currentTab + 1, totalQuestions);
	return {
		...state,
		currentTab: nextTab,
		mode: nextTab === totalQuestions ? "submit" : "navigate",
		optionIndex: 0,
		submitIndex: 0,
		inputQuestionId: null,
	};
}

function emptyAnswer(): AskAnswer {
	return { values: [], labels: [], indices: [] };
}

function cloneAnswer(answer: AskAnswer): AskAnswer {
	return {
		values: [...answer.values],
		labels: [...answer.labels],
		indices: [...answer.indices],
		customText: answer.customText,
		note: answer.note,
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}
