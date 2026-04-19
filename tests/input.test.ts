import assert from "node:assert/strict";
import test from "node:test";
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

test("typing mode delegates arrow keys to the editor", () => {
	const input = inputState();

	assert.deepEqual(getInputCommand(input, "\x1b[A"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, "\x1b[B"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, "\x1b[C"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, "\x1b[D"), {
		kind: "delegateToEditor",
	});
});

test("typing mode delegates tab to the editor", () => {
	const input = inputState();

	assert.deepEqual(getInputCommand(input, "\t"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(input, "\x1b[Z"), {
		kind: "delegateToEditor",
	});
});

test("note editing mode delegates arrows and tab to the editor", () => {
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

	assert.deepEqual(getInputCommand(state, "\x1b[A"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, "\x1b[B"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, "\x1b[C"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, "\x1b[D"), {
		kind: "delegateToEditor",
	});
	assert.deepEqual(getInputCommand(state, "\t"), {
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

	assert.deepEqual(getInputCommand(navigation, "\u0003"), {
		kind: "dismiss",
	});
	assert.deepEqual(getInputCommand(input, "\u0003"), {
		kind: "dismiss",
	});
	assert.deepEqual(getInputCommand(note, "\u0003"), {
		kind: "dismiss",
	});
});
