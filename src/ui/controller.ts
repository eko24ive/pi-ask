import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { Editor, type EditorTheme } from "@mariozechner/pi-tui";
import {
	applyNumberShortcut,
	cancelFlow,
	confirmCurrentSelection,
	createInitialState,
	enterInputMode,
	enterOptionNoteMode,
	enterQuestionNoteMode,
	getAnswer,
	getCurrentOption,
	getCurrentQuestion,
	getOptionNote,
	getQuestionNote,
	isEditingView,
	isSubmitTab,
	moveOption,
	moveTab,
	saveCustomAnswer,
	saveNote,
	submitCustomAnswer,
	toAskResult,
	toggleCurrentMultiOption,
} from "../state.ts";
import type { AskParams, AskResult, AskState } from "../types.ts";
import type { AskInputCommand } from "./input.ts";
import { formatKeybindingLabel, getInputCommand } from "./input.ts";
import { renderAskScreen } from "./render.ts";

type CustomCallback = Parameters<ExtensionContext["ui"]["custom"]>[0];
type CustomCallbackArgs = CustomCallback extends (...args: infer T) => unknown
	? T
	: never;
type Tui = CustomCallbackArgs[0];
type Theme = CustomCallbackArgs[1];
type Keybindings = CustomCallbackArgs[2];
type Done = (result: AskResult) => void;

interface AskFlowController {
	state: AskState;
	cachedLines: string[] | undefined;
	suppressAutoInputForSelection: boolean;
	newLineHint: string;
	tui: Tui;
	theme: Theme;
	editor: Editor;
	done: Done;
}

export async function runAskFlow(
	ctx: ExtensionContext,
	params: AskParams,
): Promise<AskResult> {
	return ctx.ui.custom<AskResult>((...args) =>
		createAskFlowController(args, params),
	);
}

function createAskFlowController(
	[tui, theme, keybindings, done]: [
		Tui,
		Theme,
		Keybindings,
		(result: AskResult) => void,
	],
	params: AskParams,
) {
	const controller: AskFlowController = {
		state: createInitialState(params),
		cachedLines: undefined,
		suppressAutoInputForSelection: false,
		newLineHint: formatKeybindingLabel(
			keybindings.getKeys("tui.input.newLine")[0] ?? "shift+enter",
		),
		tui,
		theme,
		editor: createEditor(tui, theme),
		done,
	};

	controller.editor.onSubmit = (value) => submitEditor(controller, value);
	syncInputModeWithSelection(controller);

	return {
		render: (width: number) => renderController(controller, width),
		invalidate() {
			controller.cachedLines = undefined;
		},
		handleInput(data: string) {
			handleControllerInput(controller, data);
		},
	};
}

function renderController(
	controller: AskFlowController,
	width: number,
): string[] {
	if (!controller.cachedLines) {
		controller.cachedLines = renderAskScreen({
			state: controller.state,
			theme: controller.theme,
			width,
			editor: controller.editor,
			newLineHint: controller.newLineHint,
		});
	}
	return controller.cachedLines;
}

function handleControllerInput(controller: AskFlowController, data: string) {
	const command = getInputCommand(controller.state, data);
	if (isEditingView(controller.state)) {
		handleEditingCommand(controller, command, data);
		return;
	}
	handleNavigationCommand(controller, command);
}

function handleEditingCommand(
	controller: AskFlowController,
	command: AskInputCommand,
	data: string,
) {
	if (command.kind === "editMoveTab") {
		controller.state = saveEditorAndMoveTab(controller, command.delta);
		syncInputModeWithSelection(controller);
		refresh(controller);
		return;
	}
	if (command.kind === "editClose") {
		controller.state = saveEditorWithoutAdvancing(controller);
		controller.suppressAutoInputForSelection =
			controller.state.view.kind !== "input";
		refresh(controller);
		return;
	}
	if (command.kind === "delegateToEditor") {
		controller.editor.handleInput(data);
		refresh(controller);
	}
}

function handleNavigationCommand(
	controller: AskFlowController,
	command: AskInputCommand,
) {
	switch (command.kind) {
		case "moveTab":
			navigateTabs(controller, command.delta);
			return;
		case "moveOption":
			navigateOptions(controller, command.delta);
			return;
		case "toggleMulti":
			handleToggleMulti(controller);
			return;
		case "openQuestionNote":
			openQuestionNote(controller);
			return;
		case "openOptionNote":
			openOptionNote(controller);
			return;
		case "confirm":
			commitNavigation(controller, confirmCurrentSelection(controller.state));
			maybeFinish(controller);
			return;
		case "cancel":
			commitNavigation(controller, cancelFlow(controller.state));
			maybeFinish(controller);
			return;
		case "numberShortcut":
			commitNavigation(
				controller,
				applyNumberShortcut(controller.state, command.digit),
			);
			return;
		case "ignore":
		case "editMoveTab":
		case "editClose":
		case "delegateToEditor":
			return;
		default:
			return;
	}
}

function navigateTabs(controller: AskFlowController, delta: 1 | -1) {
	controller.suppressAutoInputForSelection = false;
	controller.state = moveTab(controller.state, delta);
	syncInputModeWithSelection(controller);
	refresh(controller);
}

function navigateOptions(controller: AskFlowController, delta: 1 | -1) {
	controller.suppressAutoInputForSelection = false;
	controller.state = moveOption(controller.state, delta);
	syncInputModeWithSelection(controller);
	refresh(controller);
}

function handleToggleMulti(controller: AskFlowController) {
	const question = getCurrentQuestion(controller.state);
	if (question?.type !== "multi") {
		return;
	}
	controller.suppressAutoInputForSelection = false;
	commitNavigation(controller, toggleCurrentMultiOption(controller.state));
}

function openQuestionNote(controller: AskFlowController) {
	const question = getCurrentQuestion(controller.state);
	if (!question || isSubmitTab(controller.state)) {
		return;
	}
	controller.state = enterQuestionNoteMode(controller.state, question.id);
	hydrateEditorForCurrentView(controller);
	refresh(controller);
}

function openOptionNote(controller: AskFlowController) {
	const question = getCurrentQuestion(controller.state);
	const option = getCurrentOption(controller.state);
	if (
		!question ||
		!option ||
		option.isCustomOption ||
		isSubmitTab(controller.state)
	) {
		return;
	}
	controller.state = enterOptionNoteMode(
		controller.state,
		question.id,
		option.value,
	);
	hydrateEditorForCurrentView(controller);
	refresh(controller);
}

function commitNavigation(controller: AskFlowController, nextState: AskState) {
	controller.suppressAutoInputForSelection = false;
	controller.state = nextState;
	hydrateEditorForCurrentView(controller);
	refresh(controller);
}

function submitEditor(controller: AskFlowController, value: string) {
	controller.suppressAutoInputForSelection = false;
	controller.state = submitEditorValue(controller.state, value);
	controller.editor.setText("");
	refresh(controller);
	maybeFinish(controller);
}

function submitEditorValue(state: AskState, value: string): AskState {
	if (state.view.kind === "input") {
		return submitCustomAnswer(state, value);
	}
	if (state.view.kind === "note") {
		return saveNote(state, value);
	}
	return state;
}

function refresh(controller: AskFlowController) {
	controller.cachedLines = undefined;
	controller.tui.requestRender();
}

function maybeFinish(controller: AskFlowController) {
	if (controller.state.completed) {
		controller.done(toAskResult(controller.state));
	}
}

function hydrateEditorForCurrentView(controller: AskFlowController) {
	controller.editor.setText(getEditorTextForCurrentView(controller.state));
}

function syncInputModeWithSelection(controller: AskFlowController) {
	if (
		isEditingView(controller.state) ||
		isSubmitTab(controller.state) ||
		controller.suppressAutoInputForSelection
	) {
		return;
	}

	const question = getCurrentQuestion(controller.state);
	const option = getCurrentOption(controller.state);
	if (!question || !option?.isCustomOption) {
		return;
	}

	controller.state = enterInputMode(controller.state, question.id);
	hydrateEditorForCurrentView(controller);
}

function saveEditorWithoutAdvancing(controller: AskFlowController): AskState {
	const text = controller.editor.getText();
	controller.editor.setText("");
	if (controller.state.view.kind === "input") {
		return saveCustomAnswer(controller.state, text);
	}
	if (controller.state.view.kind === "note") {
		return saveNote(controller.state, text);
	}
	return controller.state;
}

function saveEditorAndMoveTab(
	controller: AskFlowController,
	delta: 1 | -1,
): AskState {
	const nextState = saveEditorWithoutAdvancing(controller);
	controller.suppressAutoInputForSelection = false;
	return moveTab(nextState, delta);
}

function createEditor(tui: Tui, theme: Theme) {
	const editorTheme: EditorTheme = {
		borderColor: (text) => theme.fg("accent", text),
		selectList: {
			selectedPrefix: (text) => theme.fg("accent", text),
			selectedText: (text) => theme.fg("accent", text),
			description: (text) => theme.fg("muted", text),
			scrollInfo: (text) => theme.fg("dim", text),
			noMatch: (text) => theme.fg("warning", text),
		},
	};
	return new Editor(tui, editorTheme);
}

function getEditorTextForCurrentView(state: AskState): string {
	if (state.view.kind === "input") {
		return getAnswer(state, state.view.questionId)?.customText ?? "";
	}
	if (state.view.kind === "note") {
		if (state.view.optionValue) {
			return (
				getOptionNote(state, state.view.questionId, state.view.optionValue) ??
				""
			);
		}
		return getQuestionNote(state, state.view.questionId) ?? "";
	}
	return "";
}
