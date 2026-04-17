import { normalizeQuestions } from "./state/normalize.ts";
import { createInitialState as createBaseState } from "./state/transitions.ts";

export { isOptionSelected } from "./state/answers.ts";
export { normalizeQuestions } from "./state/normalize.ts";
export { summarizeResult, toAskResult } from "./state/result.ts";
export {
	getAnswer,
	getCurrentOption,
	getCurrentQuestion,
	getOptionNote,
	getQuestionById,
	getQuestionNote,
	getRenderableOptions,
	isInputOpenForQuestion,
	isOptionNoteOpen,
	isQuestionAnswered,
	isQuestionNoteOpen,
	isSubmitTab,
} from "./state/selectors.ts";
export {
	applyNumberShortcut,
	cancelFlow,
	confirmCurrentSelection,
	enterInputMode,
	enterOptionNoteMode,
	enterQuestionNoteMode,
	moveOption,
	moveTab,
	reduceAskState,
	saveCustomAnswer,
	saveNote,
	submitCustomAnswer,
	toggleCurrentMultiOption,
} from "./state/transitions.ts";
export {
	inputView,
	isEditingView,
	navigateView,
	optionNoteView,
	questionNoteView,
	submitView,
} from "./state/view.ts";

export function createInitialState(
	params: Parameters<typeof normalizeQuestions>[0],
) {
	return createBaseState({
		title: params.title,
		questions: normalizeQuestions(params),
	});
}
