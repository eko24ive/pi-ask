import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import {
	Editor,
	type EditorTheme,
	Key,
	matchesKey,
	truncateToWidth,
	visibleWidth,
} from "@mariozechner/pi-tui";
import {
	applyNumberShortcut,
	cancelFlow,
	confirmCurrentSelection,
	createInitialState,
	enterInputMode,
	getAnswer,
	getCurrentQuestion,
	getRenderableOptions,
	isQuestionAnswered,
	isSubmitTab,
	moveOption,
	moveTab,
	saveCustomAnswer,
	submitCustomAnswer,
	toAskResult,
	toggleCurrentMultiOption,
} from "./state.ts";
import type { AskParams, AskResult, AskState } from "./types.ts";

export async function runAskFlow(
	ctx: ExtensionContext,
	params: AskParams,
): Promise<AskResult> {
	return ctx.ui.custom<AskResult>((tui, theme, keybindings, done) => {
		let state: AskState = createInitialState(params);
		let cachedLines: string[] | undefined;
		let suppressAutoInputForSelection = false;
		const newLineHint = formatKeybindingLabel(
			keybindings.getKeys("tui.input.newLine")[0] ?? "shift+enter",
		);

		const editorTheme: EditorTheme = {
			borderColor: (s) => theme.fg("accent", s),
			selectList: {
				selectedPrefix: (t) => theme.fg("accent", t),
				selectedText: (t) => theme.fg("accent", t),
				description: (t) => theme.fg("muted", t),
				scrollInfo: (t) => theme.fg("dim", t),
				noMatch: (t) => theme.fg("warning", t),
			},
		};
		const editor = new Editor(tui, editorTheme);

		editor.onSubmit = (value) => {
			suppressAutoInputForSelection = false;
			state = submitCustomAnswer(state, value);
			editor.setText("");
			refresh();
			maybeFinish();
		};

		function refresh() {
			cachedLines = undefined;
			tui.requestRender();
		}

		function maybeFinish() {
			if (state.completed) {
				done(toAskResult(state));
			}
		}

		function hydrateEditorForInputMode() {
			if (state.mode !== "input" || !state.inputQuestionId) {
				return;
			}
			const existingText =
				getAnswer(state, state.inputQuestionId)?.customText ?? "";
			editor.setText(existingText);
		}

		function syncInputModeWithSelection() {
			if (isSubmitTab(state)) {
				return;
			}

			const question = getCurrentQuestion(state);
			if (!question) {
				return;
			}

			const option = getRenderableOptions(question)[state.optionIndex];
			if (
				!option?.isOther ||
				suppressAutoInputForSelection ||
				state.mode === "input"
			) {
				return;
			}

			state = enterInputMode(state, question.id);
			hydrateEditorForInputMode();
		}

		syncInputModeWithSelection();

		function handleInput(data: string) {
			if (state.mode === "input") {
				if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
					state = saveCustomAnswer(state, editor.getText());
					suppressAutoInputForSelection = false;
					state = moveTab(state, 1);
					syncInputModeWithSelection();
					refresh();
					return;
				}
				if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
					state = saveCustomAnswer(state, editor.getText());
					suppressAutoInputForSelection = false;
					state = moveTab(state, -1);
					syncInputModeWithSelection();
					refresh();
					return;
				}
				if (matchesKey(data, Key.escape)) {
					state = saveCustomAnswer(state, editor.getText());
					suppressAutoInputForSelection = true;
					refresh();
					return;
				}
				editor.handleInput(data);
				refresh();
				return;
			}

			if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
				suppressAutoInputForSelection = false;
				state = moveTab(state, 1);
				syncInputModeWithSelection();
				refresh();
				return;
			}
			if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
				suppressAutoInputForSelection = false;
				state = moveTab(state, -1);
				syncInputModeWithSelection();
				refresh();
				return;
			}
			if (matchesKey(data, Key.up)) {
				suppressAutoInputForSelection = false;
				state = moveOption(state, -1);
				syncInputModeWithSelection();
				refresh();
				return;
			}
			if (matchesKey(data, Key.down)) {
				suppressAutoInputForSelection = false;
				state = moveOption(state, 1);
				syncInputModeWithSelection();
				refresh();
				return;
			}
			if (matchesKey(data, Key.space)) {
				const question = getCurrentQuestion(state);
				if (question?.type === "multi") {
					suppressAutoInputForSelection = false;
					state = toggleCurrentMultiOption(state);
					if (state.mode === "input") {
						hydrateEditorForInputMode();
					}
					refresh();
					return;
				}
			}
			if (matchesKey(data, Key.enter)) {
				suppressAutoInputForSelection = false;
				state = confirmCurrentSelection(state);
				if (state.mode === "input") {
					hydrateEditorForInputMode();
				}
				refresh();
				maybeFinish();
				return;
			}
			if (matchesKey(data, Key.escape)) {
				state = cancelFlow(state);
				refresh();
				maybeFinish();
				return;
			}

			const digit = parseDigit(data);
			if (digit !== null) {
				suppressAutoInputForSelection = false;
				state = applyNumberShortcut(state, digit);
				if (state.mode === "input") {
					hydrateEditorForInputMode();
				}
				refresh();
				return;
			}
		}

		function render(width: number): string[] {
			if (cachedLines) return cachedLines;

			const lines: string[] = [];
			const add = (text = "") => lines.push(truncateToWidth(text, width));
			const question = getCurrentQuestion(state);
			const options = getRenderableOptions(question);

			add(theme.fg("accent", "─".repeat(Math.max(1, width))));

			if (state.title) {
				add(` ${theme.fg("accent", theme.bold(state.title))}`);
				add();
			}

			add(renderTabs(state, theme, width));
			add();

			if (isSubmitTab(state)) {
				renderSubmit(lines, state, theme, width);
			} else if (question) {
				renderQuestionContent({
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

			const footer = renderFooter(state, theme);
			if (footer) {
				add();
				add(footer);
			}
			add(theme.fg("accent", "─".repeat(Math.max(1, width))));

			cachedLines = lines;
			return lines;
		}

		return {
			render,
			invalidate() {
				cachedLines = undefined;
			},
			handleInput,
		};
	});
}

function renderTabs(
	state: AskState,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
): string {
	const segments: string[] = [theme.fg("dim", "← ")];
	for (let index = 0; index < state.questions.length; index++) {
		const question = state.questions[index];
		const active = state.currentTab === index;
		const answered = isQuestionAnswered(state, question.id);
		const marker = answered ? "☒" : "☐";
		const text = ` ${marker} ${question.label} `;
		segments.push(
			active
				? theme.bg("selectedBg", theme.fg("text", text))
				: theme.fg(answered ? "success" : "muted", text),
		);
	}

	const submitActive = isSubmitTab(state);
	const submitText = " ✔ Submit ";
	segments.push(
		submitActive
			? theme.bg("selectedBg", theme.fg("text", submitText))
			: theme.fg("success", submitText),
	);
	segments.push(theme.fg("dim", " →"));

	return truncateToWidth(` ${segments.join(" ")}`, width);
}

function renderSubmit(
	lines: string[],
	state: AskState,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
) {
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	add(` ${theme.fg("accent", theme.bold("Review your answers"))}`);
	add();

	for (const question of state.questions) {
		const answer = getAnswer(state, question.id);
		add(` ${theme.fg("muted", `● ${question.prompt}`)}`);
		if (!answer) {
			add(`   ${theme.fg("warning", "→ (unanswered)")}`);
			continue;
		}
		const answerText = answer.customText ?? answer.labels.join(", ");
		add(
			`   ${theme.fg(answer.customText ? "text" : "success", `→ ${answerText}`)}`,
		);
	}

	add();
	add(` ${theme.fg("success", "Ready to submit your answers?")}`);
	add();

	const options = ["Submit answers", "Cancel"];
	for (let i = 0; i < options.length; i++) {
		const selected = i === state.submitIndex;
		const prefix = selected ? theme.fg("accent", "❯ ") : "  ";
		add(
			`${prefix}${theme.fg(selected ? "accent" : "text", `${i + 1}. ${options[i]}`)}`,
		);
	}
}

function renderQuestionContent(args: {
	lines: string[];
	state: AskState;
	question: NonNullable<ReturnType<typeof getCurrentQuestion>>;
	options: ReturnType<typeof getRenderableOptions>;
	theme: ExtensionContext["ui"]["theme"];
	width: number;
	editor: Editor;
	newLineHint: string;
}) {
	const { lines, state, question, options, theme, width, editor, newLineHint } =
		args;

	renderQuestionPrompt(lines, question.prompt, theme, width);

	if (question.type === "preview") {
		renderPreviewQuestion(
			lines,
			state,
			question,
			options,
			theme,
			width,
			editor,
			newLineHint,
		);
		return;
	}

	renderStandardQuestion(
		lines,
		state,
		question,
		options,
		theme,
		width,
		editor,
		newLineHint,
	);
}

function renderQuestionPrompt(
	lines: string[],
	prompt: string,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
) {
	lines.push(truncateToWidth(` ${theme.fg("text", prompt)}`, width));
	lines.push("");
}

function renderStandardQuestion(
	lines: string[],
	state: AskState,
	question: NonNullable<ReturnType<typeof getCurrentQuestion>>,
	options: ReturnType<typeof getRenderableOptions>,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
	editor: Editor,
	newLineHint: string,
) {
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	const isMulti = question.type === "multi";
	const answer = getAnswer(state, question.id);
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		const selected = i === state.optionIndex;
		const isAnsweredOption = option.isOther
			? !!answer?.customText
			: !!answer?.values.includes(option.value);
		const pointer = selected ? theme.fg("accent", "❯ ") : "  ";
		const prefix =
			isMulti && !option.isOther ? `[${isAnsweredOption ? "x" : " "}] ` : "";
		const optionColor = isAnsweredOption
			? "success"
			: selected
				? "accent"
				: "text";
		add(
			`${pointer}${theme.fg(optionColor, `${i + 1}. ${prefix}${option.label}`)}`,
		);
		if (option.description) {
			add(`     ${theme.fg("muted", option.description)}`);
		}
		if (option.isOther && selected && state.mode === "input") {
			for (const editorLine of editor.render(Math.max(8, width - 7))) {
				add(`     ${renderInputLine(editorLine, width - 5, theme)}`);
			}
			add(
				`     ${theme.fg("dim", `${newLineHint} newline · Enter submit · Esc save and close`)}`,
			);
		}
		if (option.isOther && state.mode !== "input") {
			const customText = answer?.customText;
			if (customText) {
				for (const customLine of customText.split("\n")) {
					add(`     ${theme.fg("muted", customLine)}`);
				}
			}
		}
	}
}

function renderPreviewQuestion(
	lines: string[],
	state: AskState,
	question: NonNullable<ReturnType<typeof getCurrentQuestion>>,
	options: ReturnType<typeof getRenderableOptions>,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
	editor: Editor,
	newLineHint: string,
) {
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	const selectedOption = options[state.optionIndex];
	const wideLayout = width >= 90 && options.length > 0;

	const answer = getAnswer(state, question.id);
	if (wideLayout) {
		const leftWidth = measurePreviewLeftWidth(options, width);
		const rightWidth = Math.max(24, width - leftWidth - 2);
		const leftPane = renderPreviewOptionList(
			state,
			question,
			options,
			theme,
			leftWidth,
		);
		const rightPane = renderPreviewPane(selectedOption, theme, rightWidth);
		for (const line of mergeColumns(leftPane, rightPane, leftWidth, width)) {
			add(line);
		}
	} else {
		renderPreviewOptionList(state, question, options, theme, width).forEach(
			add,
		);
		add("");
		renderPreviewPane(selectedOption, theme, width).forEach(add);
	}

	if (selectedOption?.isOther && state.mode === "input") {
		add("");
		for (const editorLine of editor.render(Math.max(8, width - 7))) {
			add(`     ${renderInputLine(editorLine, width - 5, theme)}`);
		}
		add(
			`     ${theme.fg("dim", `${newLineHint} newline · Enter submit · Esc save and close`)}`,
		);
	}

	if (selectedOption?.isOther && state.mode !== "input" && answer?.customText) {
		add("");
		for (const customLine of answer.customText.split("\n")) {
			add(` ${theme.fg("muted", customLine)}`);
		}
	}
}

function renderPreviewOptionList(
	state: AskState,
	question: NonNullable<ReturnType<typeof getCurrentQuestion>>,
	options: ReturnType<typeof getRenderableOptions>,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
): string[] {
	const lines: string[] = [];
	const add = (text = "") => lines.push(truncateToWidth(text, width));
	const answer = getAnswer(state, question.id);
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		const selected = i === state.optionIndex;
		const isAnsweredOption = option.isOther
			? !!answer?.customText
			: !!answer?.values.includes(option.value);
		const pointer = selected ? theme.fg("accent", "❯ ") : "  ";
		const optionColor = isAnsweredOption
			? "success"
			: selected
				? "accent"
				: "text";
		add(`${pointer}${theme.fg(optionColor, `${i + 1}. ${option.label}`)}`);
		if (option.description) {
			add(`     ${theme.fg("muted", option.description)}`);
		}
	}
	return lines;
}

function renderPreviewPane(
	selectedOption: ReturnType<typeof getRenderableOptions>[number] | undefined,
	theme: ExtensionContext["ui"]["theme"],
	width: number,
): string[] {
	const paneWidth = Math.max(10, width);
	if (!selectedOption) {
		return renderBox(
			[theme.fg("dim", "No preview available")],
			paneWidth,
			theme,
		);
	}

	const content: string[] = [];
	content.push(theme.fg("accent", theme.bold(selectedOption.label)));
	if (selectedOption.description) {
		content.push(theme.fg("muted", selectedOption.description));
	}
	if (selectedOption.preview) {
		if (content.length) {
			content.push("");
		}
		for (const previewLine of selectedOption.preview.split("\n")) {
			content.push(theme.fg("text", previewLine));
		}
	} else {
		if (content.length) {
			content.push("");
		}
		content.push(theme.fg("dim", "No preview available"));
	}

	return renderBox(content, paneWidth, theme);
}

function renderBox(
	content: string[],
	width: number,
	theme: ExtensionContext["ui"]["theme"],
): string[] {
	const boxWidth = Math.max(10, width);
	const innerWidth = Math.max(4, boxWidth - 2);
	const top = theme.fg("accent", `┌${"─".repeat(innerWidth)}┐`);
	const bottom = theme.fg("accent", `└${"─".repeat(innerWidth)}┘`);
	const lines = [top];
	for (const rawLine of content) {
		const line = truncateToWidth(rawLine, innerWidth);
		const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(line)));
		lines.push(
			theme.fg("accent", "│") + line + padding + theme.fg("accent", "│"),
		);
	}
	lines.push(bottom);
	return lines;
}

function mergeColumns(
	left: string[],
	right: string[],
	leftWidth: number,
	width: number,
): string[] {
	const lines: string[] = [];
	const rowCount = Math.max(left.length, right.length);
	for (let index = 0; index < rowCount; index++) {
		const leftLine = left[index] ?? "";
		const rightLine = right[index] ?? "";
		const paddedLeft = padToVisibleWidth(leftLine, leftWidth);
		lines.push(truncateToWidth(`${paddedLeft}  ${rightLine}`, width));
	}
	return lines;
}

function padToVisibleWidth(text: string, width: number): string {
	return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function measurePreviewLeftWidth(
	options: ReturnType<typeof getRenderableOptions>,
	width: number,
): number {
	let widest = 0;
	for (let i = 0; i < options.length; i++) {
		const option = options[i];
		const labelWidth = visibleWidth(`${i + 1}. ${option.label}`);
		const descriptionWidth = option.description
			? visibleWidth(option.description)
			: 0;
		widest = Math.max(widest, labelWidth, descriptionWidth);
	}

	const preferred = widest + 4;
	const maxWidth = Math.min(34, Math.floor(width * 0.34));
	return clamp(preferred, 22, Math.max(22, maxWidth));
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function renderFooter(
	state: AskState,
	theme: ExtensionContext["ui"]["theme"],
): string {
	if (state.mode === "input") {
		return "";
	}

	const question = getCurrentQuestion(state);
	if (isSubmitTab(state)) {
		return theme.fg("dim", " ↑↓ select · Enter confirm · Esc cancel");
	}
	if (question?.type === "multi") {
		return theme.fg(
			"dim",
			" ⇆ tab · ↑↓ select · space toggle · enter continue · esc dismiss · 1-9 quick toggle",
		);
	}
	return theme.fg("dim", " ⇆ tab · ↑↓ select · enter confirm · esc dismiss");
}

function parseDigit(data: string): number | null {
	return /^[1-9]$/.test(data) ? Number(data) : null;
}

function renderInputLine(
	line: string,
	availableWidth: number,
	theme: ExtensionContext["ui"]["theme"],
): string {
	const innerWidth = Math.max(4, availableWidth - 2);
	const truncated = truncateToWidth(line, innerWidth);
	const padding = " ".repeat(Math.max(0, innerWidth - visibleWidth(truncated)));
	return theme.bg("toolPendingBg", ` ${truncated}${padding} `);
}

function formatKeybindingLabel(key: string): string {
	return key
		.split("+")
		.map((part) => {
			if (part.length <= 1) {
				return part.toUpperCase();
			}
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join("+");
}
