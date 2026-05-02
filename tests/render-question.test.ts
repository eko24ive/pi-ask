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

function mockTheme() {
	return {
		fg(color: string, text: string) {
			return `<${color}>${text}</${color}>`;
		},
		bg(color: string, text: string) {
			return `{${color}}${text}{/${color}}`;
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

test("preview questions also show the custom answer option", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick one",
				type: "preview",
				options: [{ value: "a", label: "A", preview: "Preview A" }],
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
