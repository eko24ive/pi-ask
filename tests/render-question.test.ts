import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/state/create.ts";
import { getRenderableOptions } from "../src/state/selectors.ts";
import {
	applyNumberShortcut,
	enterOptionNoteMode,
	enterQuestionNoteMode,
} from "../src/state/transitions.ts";
import { renderQuestionScreen } from "../src/ui/render-question.ts";

function mockTheme(onColor?: (color: string, text: string) => void) {
	return {
		fg(color: string, text: string) {
			onColor?.(color, text);
			return onColor ? text : `<${color}>${text}</${color}>`;
		},
		bg(color: string, text: string) {
			return onColor ? text : `{${color}}${text}{/${color}}`;
		},
		bold(text: string) {
			return text;
		},
	} as never;
}

function mockEditor(text = "", renderedLines?: string[]) {
	return {
		getText() {
			return text;
		},
		render() {
			return renderedLines ?? [];
		},
	} as never;
}

test("custom option stays labeled before selection", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor(),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	assert(lines.some((line) => line.includes("Type your own")));
	assert(!lines.some((line) => line.includes("Type your answer...")));
});

test("standard options show recommendation metadata without changing answers", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				options: [
					{
						value: "a",
						label: "Option A",
						description: "Best fit for the stated constraints",
						recommended: true,
					},
					{ value: "b", label: "Option B" },
				],
			},
		],
	});

	const lines: string[] = [];
	const calls: Array<{ color: string; text: string }> = [];
	renderQuestionScreen({
		editor: mockEditor(),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme((color, text) => calls.push({ color, text })),
		width: 80,
	});

	assert(lines.some((line) => line.includes("(recommended) | Best fit")));
	assert(
		calls.some(
			(call) => call.color === "warning" && call.text === "(recommended)"
		)
	);
	assert(
		calls.some(
			(call) =>
				call.color === "muted" &&
				call.text === " | Best fit for the stated constraints"
		)
	);
	assert.equal(state.answers.q1, undefined);

	state = applyNumberShortcut(state, 1);
	assert.equal(state.answers.q1.selected[0]?.label, "Option A");
});

test("selected custom option keeps its label and renders editor below", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	state = applyNumberShortcut(state, 2);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("", ["┌────┐", "", "└────┘"]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	assert(lines.some((line) => line.includes("Type your own")));
	assert(lines.some((line) => line.includes("Type answer...")));
});

test("open question note renders inline label and editor", () => {
	const state = enterQuestionNoteMode(
		createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Pick any extra things to include.",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		"q1"
	);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("", ["┌────┐", "", "└────┘"]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	const promptIndex = lines.findIndex((line) =>
		line.includes("Pick any extra things to include.")
	);
	const inputIndex = lines.findIndex((line) => line.includes("Add a note..."));

	assert.notEqual(promptIndex, -1);
	assert.equal(inputIndex, promptIndex + 1);
	assert(!lines.some((line) => line.includes("Note:")));
});

test("open option note renders flush below the option", () => {
	const state = enterOptionNoteMode(
		createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Pick one",
					options: [{ value: "a", label: "Option A" }],
				},
			],
		}),
		"q1",
		"a"
	);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("", ["┌────┐", "", "└────┘"]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	const optionIndex = lines.findIndex((line) => line.includes("Option A"));
	const inputIndex = lines.findIndex((line) => line.includes("Add a note..."));

	assert.notEqual(optionIndex, -1);
	assert.equal(inputIndex, optionIndex + 1);
});

test("selected multiline custom option renders full editor block", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	state = applyNumberShortcut(state, 2);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("first line\nsecond line", [
			"┌────┐",
			"first line",
			"second line",
			"└────┘",
		]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	assert(lines.some((line) => line.includes("Type your own")));
	assert(lines.some((line) => line.includes("first line")));
	assert(lines.some((line) => line.includes("second line")));
	assert(!lines.some((line) => line.includes("first line second line")));
});

test("freeform-only question renders label without numbering or pointer and separates input", () => {
	const state = createInitialState(
		{
			questions: [
				{
					id: "q1",
					prompt: "Type one",
					options: [
						{ value: "freeform", label: "Type answer", freeform: true },
					],
				},
			],
		},
		{ allowFreeform: true }
	);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("", ["┌────┐", "", "└────┘"]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state: { ...state, view: { kind: "input", questionId: "q1" } },
		theme: mockTheme(),
		width: 80,
	});

	const labelIndex = lines.findIndex((line) =>
		line.includes("Type your answer:")
	);
	const inputIndex = lines.findIndex((line) => line.includes("Type answer..."));

	assert.notEqual(labelIndex, -1);
	assert.equal(inputIndex, labelIndex + 2);
	assert(lines[labelIndex]?.startsWith(" "));
	assert(lines[inputIndex]?.startsWith(" "));
	assert(!lines[inputIndex]?.startsWith("     "));
	assert(!lines.some((line) => line.includes("1. Type your answer:")));
	assert(!lines.some((line) => line.includes("❯")));
});

test("preview questions show custom and recommended options", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				type: "preview",
				options: [
					{
						value: "a",
						label: "A",
						preview: "Preview A",
						recommended: true,
					},
				],
			},
		],
	});

	const lines: string[] = [];
	const calls: Array<{ color: string; text: string }> = [];
	renderQuestionScreen({
		editor: mockEditor(),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme((color, text) => calls.push({ color, text })),
		width: 80,
	});

	assert(lines.some((line) => line.includes("Type your own")));
	assert(lines.some((line) => line.trim() === "(recommended)"));
	assert(
		calls.some(
			(call) => call.color === "warning" && call.text === "(recommended)"
		)
	);
	assert(
		!calls.some((call) => call.color === "muted" && call.text.startsWith(" |"))
	);
	assert.equal(state.answers.q1, undefined);
});

test("preview custom option reuses the normal inline editor", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				type: "preview",
				options: [{ value: "a", label: "A", preview: "Preview A" }],
			},
		],
	});
	state = applyNumberShortcut(state, 2);

	const lines: string[] = [];
	renderQuestionScreen({
		editor: mockEditor("", ["┌────┐", "", "└────┘"]),
		lines,
		options: getRenderableOptions(state.questions[0]),
		question: state.questions[0],
		state,
		theme: mockTheme(),
		width: 80,
	});

	assert(lines.some((line) => line.includes("Type your own")));
	assert(lines.some((line) => line.includes("Type answer...")));
	const optionIndex = lines.findIndex((line) => line.includes("Type your own"));
	const inputIndex = lines.findIndex((line) => line.includes("Type answer..."));
	assert.equal(inputIndex, optionIndex + 1);
	assert(!lines.some((line) => line.includes("Preview A")));
});
