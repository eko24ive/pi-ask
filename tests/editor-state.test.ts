import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/state/create.ts";
import {
	getEditorDraft,
	saveEditorDraft,
	submitEditorDraft,
	syncStateToSelection,
} from "../src/state/editor.ts";
import { enterQuestionNoteMode } from "../src/state/transitions.ts";

test("syncStateToSelection opens input when custom option is active", () => {
	const state = {
		...createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Pick one",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		activeOptionIndex: 1,
	};

	const next = syncStateToSelection(state);
	assert.equal(next.view.kind, "input");
	assert.equal(next.view.questionId, "q1");
});

test("saveEditorDraft stores question note drafts without advancing", () => {
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

	const next = saveEditorDraft(state, "needs examples");
	assert.equal(next.view.kind, "navigate");
	assert.equal(next.answers.q1.note, "needs examples");
});

test("submitEditorDraft advances submitted custom answers", () => {
	const state = syncStateToSelection({
		...createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Pick one",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		activeOptionIndex: 1,
	});

	const next = submitEditorDraft(state, "custom answer");
	assert.equal(next.answers.q1.customText, "custom answer");
	assert.equal(next.view.kind, "submit");
});

test("submitEditorDraft saves notes without completing the ask flow", () => {
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

	const next = submitEditorDraft(state, "needs examples");
	assert.equal(next.answers.q1.note, "needs examples");
	assert.equal(next.view.kind, "navigate");
	assert.equal(next.completed, false);
	assert.equal(next.cancelled, false);
});

test("getEditorDraft reads saved note and custom text from view", () => {
	let state = syncStateToSelection({
		...createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Pick one",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		activeOptionIndex: 1,
	});
	state = saveEditorDraft(state, "draft answer");
	state = enterQuestionNoteMode(state, "q1");
	state = saveEditorDraft(state, "saved note");
	state = enterQuestionNoteMode(state, "q1");

	assert.equal(getEditorDraft(state), "saved note");
	assert.equal(
		getEditorDraft({ ...state, view: { kind: "input", questionId: "q1" } }),
		"draft answer"
	);
});
