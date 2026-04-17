import {
	getCurrentQuestion,
	getRenderableOptions,
	isSubmitTab,
} from "../state.ts";
import type { AskState } from "../types.ts";
import { renderFrameFooter, renderFrameHeader } from "./render-frame.ts";
import { renderQuestionScreen } from "./render-question.ts";
import { renderSubmitScreen } from "./render-submit.ts";
import type { QuestionRenderContext, Theme } from "./render-types.ts";

export function renderAskScreen(args: {
	state: AskState;
	theme: Theme;
	width: number;
	editor: QuestionRenderContext["editor"];
	newLineHint: string;
}): string[] {
	const { state, theme, width, editor, newLineHint } = args;
	const lines: string[] = [];
	const question = getCurrentQuestion(state);
	const options = getRenderableOptions(question);

	renderFrameHeader({ lines, state, theme, width });

	if (isSubmitTab(state)) {
		renderSubmitScreen(lines, state, theme, width);
	} else if (question) {
		renderQuestionScreen({
			lines,
			state,
			question,
			options,
			theme,
			width,
			editor,
			newLineHint,
		});
	}

	renderFrameFooter({ lines, state, theme, width });
	return lines;
}
