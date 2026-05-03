import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { createInitialState } from "../src/state/create.ts";
import {
	applyNumberShortcut,
	enterQuestionNoteMode,
} from "../src/state/transitions.ts";
import { getInputCommand } from "../src/ui/input.ts";

function inputState() {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	state = applyNumberShortcut(state, 2);
	return state;
}

test("empty typing mode uses arrows and tab for navigation", () => {
	const input = inputState();

	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[A", ""), {
		kind: "editMoveOption",
		delta: -1,
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[B", ""), {
		kind: "editMoveOption",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[C", ""), {
		kind: "editMoveTab",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[D", ""), {
		kind: "editMoveTab",
		delta: -1,
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\t", ""), {
		kind: "editMoveTab",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[Z", ""), {
		kind: "editMoveTab",
		delta: -1,
	});
});

test("non-empty typing mode keeps arrows and tab in editor", () => {
	const input = inputState();

	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[A", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[B", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[C", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[D", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\t", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\x1b[Z", "x"), {
		kind: "delegateToEditor",
	});
});

test("empty note editing mode uses arrows and tab for navigation", () => {
	const state = enterQuestionNoteMode(
		createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Question?",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		"q1"
	);

	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[A", ""), {
		kind: "editMoveOption",
		delta: -1,
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[B", ""), {
		kind: "editMoveOption",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[C", ""), {
		kind: "editMoveTab",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[D", ""), {
		kind: "editMoveTab",
		delta: -1,
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\t", ""), {
		kind: "editMoveTab",
		delta: 1,
	});
});

test("non-empty note editing mode keeps arrows and tab in editor", () => {
	const state = enterQuestionNoteMode(
		createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Question?",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		"q1"
	);

	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[A", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[B", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[C", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\x1b[D", "x"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, DEFAULT_ASK_CONFIG, "\t", "x"), {
		kind: "delegateToEditor",
	});
});

test("ctrl+c dismisses the flow from both navigation and editing modes", () => {
	const navigation = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	const input = inputState();
	const note = enterQuestionNoteMode(navigation, "q1");

	assert.deepEqual(getInputCommand(navigation, DEFAULT_ASK_CONFIG, "\u0003"), {
		kind: "dismiss",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "\u0003"), {
		kind: "dismiss",
	});
	assert.deepEqual(getInputCommand(note, DEFAULT_ASK_CONFIG, "\u0003"), {
		kind: "dismiss",
	});
});

test("question mark opens ask settings outside non-empty editors", () => {
	const navigation = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	const input = inputState();

	assert.deepEqual(getInputCommand(navigation, DEFAULT_ASK_CONFIG, "?"), {
		kind: "showSettings",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "?", ""), {
		kind: "showSettings",
	});
	assert.deepEqual(getInputCommand(input, DEFAULT_ASK_CONFIG, "?", "x"), {
		kind: "delegateToEditor",
	});
});

test("navigation mode uses configured option movement keymaps", () => {
	const navigation = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	const config = {
		...DEFAULT_ASK_CONFIG,
		keymaps: {
			...DEFAULT_ASK_CONFIG.keymaps,
			previousOption: "ctrl+p",
			nextOption: "ctrl+n",
		},
	};

	assert.deepEqual(getInputCommand(navigation, config, "\x10"), {
		kind: "moveOption",
		delta: -1,
	});
	assert.deepEqual(getInputCommand(navigation, config, "\x0e"), {
		kind: "moveOption",
		delta: 1,
	});
	assert.deepEqual(getInputCommand(navigation, config, "\x1b[A"), {
		kind: "ignore",
	});
	assert.deepEqual(getInputCommand(navigation, config, "\x1b[B"), {
		kind: "ignore",
	});
});

test("note shortcuts use n for option notes and Shift+N for question notes", () => {
	const navigation = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	assert.deepEqual(getInputCommand(navigation, DEFAULT_ASK_CONFIG, "n"), {
		kind: "openOptionNote",
	});
	assert.deepEqual(getInputCommand(navigation, DEFAULT_ASK_CONFIG, "N"), {
		kind: "openQuestionNote",
	});
});

test("custom configured note shortcuts are used at runtime", () => {
	const navigation = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});
	const config = {
		...DEFAULT_ASK_CONFIG,
		keymaps: {
			...DEFAULT_ASK_CONFIG.keymaps,
			optionNote: "x",
			questionNote: "shift+x",
		},
	};

	assert.deepEqual(getInputCommand(navigation, config, "x"), {
		kind: "openOptionNote",
	});
	assert.deepEqual(getInputCommand(navigation, config, "X"), {
		kind: "openQuestionNote",
	});
});
