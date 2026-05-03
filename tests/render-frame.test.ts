import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { createInitialState } from "../src/state/create.ts";
import { renderAskScreen } from "../src/ui/render.ts";

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

function plainTheme() {
	return {
		fg(_color: string, text: string) {
			return text;
		},
		bg(_color: string, text: string) {
			return text;
		},
		bold(text: string) {
			return text;
		},
	} as never;
}

test("wide header keeps all tabs and framing arrows on the tab row", () => {
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
		config: DEFAULT_ASK_CONFIG,
		state,
		theme: plainTheme(),
		width: 120,
		editor: mockEditor(),
	});

	assert.equal(lines[3], " ←  ☐ One   ☐ Two   ☰ Review  →");
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
		config: DEFAULT_ASK_CONFIG,
		state,
		theme: plainTheme(),
		width: 28,
		editor: mockEditor(),
	});

	assert.equal(lines[3], " ←  ☐ Three   ☐ Four  →");
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
		config: DEFAULT_ASK_CONFIG,
		state,
		theme: plainTheme(),
		width: 24,
		editor: mockEditor(),
	});

	assert.equal(lines[3], " ←  ☰ Review  →");
});

test("tab strip avoids truncation at narrow boundary widths", () => {
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

	const expectedByWidth = new Map([
		[28, " ←  ☐ Three   ☐ Four  →"],
		[29, " ←  ☐ Three   ☐ Four  →"],
		[30, " ←  ☐ Three   ☐ Four  →"],
		[31, " ←  ☐ Two   ☐ Three   ☐ Four  →"],
		[32, " ←  ☐ Two   ☐ Three   ☐ Four  →"],
	]);

	for (const [width, expected] of expectedByWidth) {
		const lines = renderAskScreen({
			config: DEFAULT_ASK_CONFIG,
			state,
			theme: plainTheme(),
			width,
			editor: mockEditor(),
		});
		assert.equal(lines[3], expected);
	}
});

test("footer hints wrap into exact lines on narrow screens", () => {
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
		config: DEFAULT_ASK_CONFIG,
		state,
		theme: plainTheme(),
		width: 26,
		editor: mockEditor(),
	});

	assert.deepEqual(lines.slice(-5, -1), [
		"Space toggle",
		"Enter continue",
		"N/Shift+N note",
		"Esc dismiss · ? settings",
	]);
});

test("footer keeps earlier hint chunk on the first wrapped line", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	const lines = renderAskScreen({
		config: DEFAULT_ASK_CONFIG,
		state,
		theme: plainTheme(),
		width: 22,
		editor: mockEditor(),
	});

	assert.equal(lines.at(-6), " ⇆ tab · ↑/↓ select");
	assert.deepEqual(lines.slice(-5, -1), [
		"Enter confirm",
		"N/Shift+N note",
		"Esc dismiss",
		"? settings",
	]);
});

test("footer hints can be hidden without affecting frame rendering", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	const config = {
		...DEFAULT_ASK_CONFIG,
		behaviour: {
			...DEFAULT_ASK_CONFIG.behaviour,
			showFooterHints: false,
		},
	};

	const lines = renderAskScreen({
		config,
		state,
		theme: plainTheme(),
		width: 22,
		editor: mockEditor(),
	});

	assert.equal(lines.at(-1), "──────────────────────");
	assert.equal(lines.join("\n").includes("? settings"), false);
	assert.equal(lines.join("\n").includes("Enter confirm"), false);
});
