import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/state/create.ts";
import { getRenderableOptions } from "../src/state/selectors.ts";
import { applyNumberShortcut } from "../src/state/transitions.ts";
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
	assert(lines.some((line) => line.includes("Type your answer...")));
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
