import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";
import {
	getAnswer,
	getOptionNote,
	getQuestionNote,
	isInputOpenForQuestion,
	isOptionNoteOpen,
	isOptionSelected,
	isQuestionNoteOpen,
} from "../state.ts";
import type { AskDisplayOption } from "../types.ts";
import { UI_DIMENSIONS, UI_TEXT } from "./constants.ts";
import {
	measurePreviewLeftWidth,
	mergeColumns,
	pushWrappedText,
	renderEditorBlock,
	renderHint,
	renderPreviewPaneContent,
} from "./render-helpers.ts";
import type {
	OptionDetailRenderContext,
	QuestionRenderContext,
	Theme,
} from "./render-types.ts";

export function renderQuestionScreen(context: QuestionRenderContext) {
	const { lines, question, theme, width } = context;
	pushWrappedText(lines, question.prompt, width, theme, "text", " ", " ");
	lines.push("");
	renderQuestionNote(context);

	if (question.type === "preview") {
		renderPreviewQuestion(context);
		return;
	}

	renderStandardQuestion(context);
}

function renderQuestionNote(context: QuestionRenderContext) {
	const { lines, state, question, theme, width, editor, newLineHint } = context;
	if (isQuestionNoteOpen(state, question.id)) {
		pushWrappedText(
			lines,
			UI_TEXT.questionNoteTitle,
			width,
			theme,
			"accent",
			" ",
			" ",
		);
		renderEditorBlock({
			lines,
			editorLines: editor.render(
				Math.max(
					UI_DIMENSIONS.editorMinWidth,
					width - UI_DIMENSIONS.editorContentPadding,
				),
			),
			width,
			theme,
			indent: "   ",
			availableWidth: width - 3,
			hint: renderHint(UI_TEXT.hintSave, newLineHint),
		});
		lines.push("");
		return;
	}

	const existingNote = getQuestionNote(state, question.id);
	if (!existingNote) {
		return;
	}
	pushWrappedText(
		lines,
		`Question note: ${existingNote}`,
		width,
		theme,
		"muted",
		" ",
		"   ",
	);
	lines.push("");
}

function renderStandardQuestion(context: QuestionRenderContext) {
	const { options } = context;
	for (let index = 0; index < options.length; index++) {
		renderStandardOption(context, options[index], index);
	}
}

function renderStandardOption(
	context: QuestionRenderContext,
	option: AskDisplayOption,
	index: number,
) {
	const { lines, state, question, theme, width } = context;
	const answer = getAnswer(state, question.id);
	const selected = index === state.activeOptionIndex;
	const isAnsweredOption = option.isCustomOption
		? !!answer?.customText
		: isOptionSelected(answer, option.value);
	const pointer = selected ? "❯ " : "  ";
	const prefix = getOptionPrefix(question.type, option, isAnsweredOption);
	const optionColor = getOptionColor(isAnsweredOption, selected);

	pushWrappedText(
		lines,
		`${index + 1}. ${prefix}${option.label}`,
		width,
		theme,
		optionColor,
		pointer,
		" ".repeat(visibleWidth(pointer)),
	);
	renderOptionMeta({
		...context,
		questionId: question.id,
		answer,
		option,
		selected,
	});
}

function renderPreviewQuestion(context: QuestionRenderContext) {
	const { lines, state, question, options, theme, width } = context;
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	const selectedOption = options[state.activeOptionIndex];
	const answer = getAnswer(state, question.id);

	if (width >= UI_DIMENSIONS.previewWideMinWidth && options.length > 0) {
		renderWidePreviewLayout(
			add,
			state,
			options,
			theme,
			width,
			answer,
			selectedOption,
		);
	} else {
		renderStackedPreviewLayout(
			add,
			state,
			options,
			theme,
			width,
			answer,
			selectedOption,
		);
	}

	renderOptionEditorOrNote({
		...context,
		questionId: question.id,
		answer,
		option: selectedOption,
		withGap: true,
	});
}

function renderWidePreviewLayout(
	add: (text?: string) => void,
	state: QuestionRenderContext["state"],
	options: QuestionRenderContext["options"],
	theme: Theme,
	width: number,
	answer: ReturnType<typeof getAnswer>,
	selectedOption: AskDisplayOption | undefined,
) {
	const leftWidth = measurePreviewLeftWidth(options, width);
	const rightWidth = Math.max(
		UI_DIMENSIONS.previewMinRightWidth,
		width - leftWidth - 2,
	);
	const leftPane = renderPreviewOptionList(
		state,
		options,
		theme,
		leftWidth,
		answer,
	);
	const rightPane = renderPreviewPaneContent(selectedOption, theme, rightWidth);
	for (const line of mergeColumns(leftPane, rightPane, leftWidth, width)) {
		add(line);
	}
}

function renderStackedPreviewLayout(
	add: (text?: string) => void,
	state: QuestionRenderContext["state"],
	options: QuestionRenderContext["options"],
	theme: Theme,
	width: number,
	answer: ReturnType<typeof getAnswer>,
	selectedOption: AskDisplayOption | undefined,
) {
	renderPreviewOptionList(state, options, theme, width, answer).forEach(add);
	add("");
	renderPreviewPaneContent(selectedOption, theme, width).forEach(add);
}

function renderPreviewOptionList(
	state: QuestionRenderContext["state"],
	options: QuestionRenderContext["options"],
	theme: Theme,
	width: number,
	answer: ReturnType<typeof getAnswer>,
): string[] {
	const lines: string[] = [];
	for (let index = 0; index < options.length; index++) {
		const option = options[index];
		const selected = index === state.activeOptionIndex;
		const isAnsweredOption = option.isCustomOption
			? !!answer?.customText
			: isOptionSelected(answer, option.value);
		pushWrappedText(
			lines,
			`${index + 1}. ${option.label}`,
			width,
			theme,
			getOptionColor(isAnsweredOption, selected),
			selected ? "❯ " : "  ",
			"  ",
		);
		if (option.description) {
			pushWrappedText(
				lines,
				option.description,
				width,
				theme,
				"muted",
				"     ",
				"     ",
			);
		}
	}
	return lines;
}

function renderOptionMeta(
	context: QuestionRenderContext & {
		questionId: string;
		answer: ReturnType<typeof getAnswer>;
		option: AskDisplayOption;
		selected: boolean;
	},
) {
	const { lines, option, theme, width } = context;
	if (option.description) {
		pushWrappedText(
			lines,
			option.description,
			width,
			theme,
			"muted",
			"     ",
			"     ",
		);
	}
	renderOptionEditorOrNote(context);
}

function renderOptionEditorOrNote(context: OptionDetailRenderContext) {
	const { lines, option, withGap } = context;
	if (!option) {
		return;
	}

	const renderState = getOptionDetailRenderState(context);
	if (withGap && hasOptionDetailContent(renderState)) {
		lines.push("");
	}
	if (renderOptionEditor(context, renderState)) {
		return;
	}
	if (renderOptionContent(context, renderState)) {
		return;
	}
	renderSavedOptionNote(context, renderState.optionNote);
}

function getOptionDetailRenderState(context: OptionDetailRenderContext) {
	const { state, questionId, answer, option, selected } = context;
	const inputOpen =
		option?.isCustomOption &&
		selected &&
		isInputOpenForQuestion(state, questionId);
	const noteOpen =
		!!option &&
		!option.isCustomOption &&
		isOptionNoteOpen(state, questionId, option.value);
	const optionNote =
		option && !option.isCustomOption
			? getOptionNote(state, questionId, option.value)
			: undefined;
	const customText = option?.isCustomOption ? answer?.customText : undefined;

	return {
		inputOpen,
		noteOpen,
		optionNote,
		customText,
	};
}

function hasOptionDetailContent(
	renderState: ReturnType<typeof getOptionDetailRenderState>,
) {
	return !!(
		renderState.noteOpen ||
		renderState.inputOpen ||
		renderState.customText ||
		renderState.optionNote
	);
}

function renderOptionEditor(
	context: OptionDetailRenderContext,
	renderState: ReturnType<typeof getOptionDetailRenderState>,
): boolean {
	const { lines, editor, width, theme, newLineHint } = context;
	if (renderState.noteOpen) {
		renderIndentedEditor(
			lines,
			editor,
			width,
			theme,
			renderHint(UI_TEXT.hintSave, newLineHint),
		);
		return true;
	}
	if (renderState.inputOpen) {
		renderIndentedEditor(
			lines,
			editor,
			width,
			theme,
			renderHint(UI_TEXT.hintSubmit, newLineHint),
		);
		return true;
	}
	return false;
}

function renderOptionContent(
	context: OptionDetailRenderContext,
	renderState: ReturnType<typeof getOptionDetailRenderState>,
): boolean {
	const { lines, option, theme, width } = context;
	if (!option?.isCustomOption || !renderState.customText) {
		return false;
	}
	pushWrappedText(
		lines,
		renderState.customText,
		width,
		theme,
		"muted",
		"     ",
		"     ",
	);
	return true;
}

function renderSavedOptionNote(
	context: OptionDetailRenderContext,
	optionNote: string | undefined,
) {
	if (!optionNote) {
		return;
	}
	const { lines, theme, width } = context;
	pushWrappedText(
		lines,
		`Note: ${optionNote}`,
		width,
		theme,
		"muted",
		"     ",
		"     ",
	);
}

function renderIndentedEditor(
	lines: string[],
	editor: QuestionRenderContext["editor"],
	width: number,
	theme: Theme,
	hint: string,
) {
	renderEditorBlock({
		lines,
		editorLines: editor.render(
			Math.max(
				UI_DIMENSIONS.editorMinWidth,
				width - UI_DIMENSIONS.editorIndentedPadding,
			),
		),
		width,
		theme,
		indent: "     ",
		availableWidth: width - 5,
		hint,
	});
}

function getOptionPrefix(
	questionType: QuestionRenderContext["question"]["type"],
	option: AskDisplayOption,
	isAnsweredOption: boolean,
): string {
	if (questionType !== "multi" || option.isCustomOption) {
		return "";
	}
	return `[${isAnsweredOption ? "x" : " "}] `;
}

function getOptionColor(isAnsweredOption: boolean, selected: boolean) {
	if (isAnsweredOption) {
		return "success";
	}
	if (selected) {
		return "accent";
	}
	return "text";
}
