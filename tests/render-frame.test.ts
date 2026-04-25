import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/state/create.ts";
import { renderAskScreen } from "../src/ui/render.ts";

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

function mockEditor() {
	return {
		getText() {
			return "";
		},
		render() {
			return [];
		},
	} as never;
}

test("tab strip always shows dimmed framing arrows on wide screens", () => {
	const state = createInitialState({
		title: "Demo",
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q2",
				label: "Two",
				prompt: "Two",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	const lines = renderAskScreen({
		state,
		theme: mockTheme(),
		width: 120,
		editor: mockEditor(),
	});

	assert(lines.some((line) => line.includes("<dim>← </dim>")));
	assert(lines.some((line) => line.includes("<success> ✔ Submit </success>")));
});

test("narrow tab strip keeps active middle tab visible", () => {
	const state = createInitialState({
		title: "Demo",
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q2",
				label: "Two",
				prompt: "Two",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q3",
				label: "Three",
				prompt: "Three",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q4",
				label: "Four",
				prompt: "Four",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q5",
				label: "Five",
				prompt: "Five",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	state.activeTabIndex = 2;

	const lines = renderAskScreen({
		state,
		theme: mockTheme(),
		width: 28,
		editor: mockEditor(),
	});

	assert(lines.some((line) => line.includes("Three")));
	assert(!lines.some((line) => line.includes("{selectedBg}<text> One ")));
});

test("narrow tab strip keeps submit tab visible when active", () => {
	const state = createInitialState({
		title: "Demo",
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q2",
				label: "Two",
				prompt: "Two",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q3",
				label: "Three",
				prompt: "Three",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	state.activeTabIndex = state.questions.length;
	state.view = { kind: "submit" };

	const lines = renderAskScreen({
		state,
		theme: mockTheme(),
		width: 24,
		editor: mockEditor(),
	});

	assert(lines.some((line) => line.includes("Submit")));
	assert(lines.some((line) => line.includes("←") || line.includes("→")));
});

test("footer hints wrap on narrow screens instead of truncating", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				label: "Features",
				prompt: "Pick features",
				type: "multi",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	const lines = renderAskScreen({
		state,
		theme: mockTheme(),
		width: 26,
		editor: mockEditor(),
	});

	assert(lines.some((line) => line.includes("Space toggle")));
	assert(lines.some((line) => line.includes("Enter continue")));
	assert(lines.some((line) => line.includes("N/Shift+N note")));
});
