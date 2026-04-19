import assert from "node:assert/strict";
import test from "node:test";
import { createInitialState } from "../src/state/create.ts";
import { toAskResult } from "../src/state/result.ts";
import { getRenderableOptions } from "../src/state/selectors.ts";
import {
	applyNumberShortcut,
	cancelFlow,
	confirmCurrentSelection,
	dismissFlow,
	enterOptionNoteMode,
	enterQuestionNoteMode,
	moveOption,
	moveTab,
	saveCustomAnswer,
	saveNote,
	submitCustomAnswer,
	toggleCurrentMultiOption,
} from "../src/state/transitions.ts";
import type { AskParams } from "../src/types.ts";

function sampleParams(): AskParams {
	return {
		title: "Interview",
		questions: [
			{
				id: "lang",
				label: "Language",
				prompt: "What language?",
				options: [
					{ value: "py", label: "Python" },
					{ value: "ts", label: "TypeScript" },
				],
			},
			{
				id: "fe",
				label: "Frontend",
				prompt: "Which frameworks?",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	};
}

test("normalize defaults via initial state", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Question?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	assert.equal(state.questions[0].label, "Q1");
	assert.equal(state.questions[0].type, "single");
	assert.equal(state.questions[0].required, true);
	assert.equal(
		getRenderableOptions(state.questions[0]).at(-1)?.label,
		"Type your own"
	);
	assert.equal(
		getRenderableOptions(state.questions[0]).at(-1)?.isCustomOption,
		true
	);
});

test("preview questions keep their type and option previews", () => {
	const state = createInitialState({
		questions: [
			{
				id: "preview",
				label: "Preview",
				prompt: "What layout?",
				type: "preview",
				options: [{ value: "a", label: "Option A", preview: "Example" }],
			},
		],
	});

	assert.equal(state.questions[0].type, "preview");
	assert.equal(state.questions[0].options[0].preview, "Example");
	assert.equal(
		getRenderableOptions(state.questions[0]).at(-1)?.isCustomOption,
		undefined
	);
	assert.equal(getRenderableOptions(state.questions[0]).length, 1);
});

test("single-select number shortcut stores answer and advances to next tab", () => {
	let state = createInitialState(sampleParams());
	state = applyNumberShortcut(state, 2);

	assert.equal(state.answers.lang.selected[0].label, "TypeScript");
	assert.equal(state.activeTabIndex, 1);
	assert.equal(state.view.kind, "navigate");
});

test("multi-select space toggles current option and enter advances to submit", () => {
	let state = createInitialState(sampleParams());
	state = applyNumberShortcut(state, 1);
	state = toggleCurrentMultiOption(state);
	assert.deepEqual(
		state.answers.fe.selected.map((selection) => selection.label),
		["React"]
	);

	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	assert.deepEqual(
		state.answers.fe.selected.map((selection) => selection.label),
		["React", "Vue"]
	);

	state = confirmCurrentSelection(state);
	assert.equal(state.view.kind, "submit");
	assert.equal(state.activeTabIndex, 2);
	assert.equal(state.completed, false);
});

test("single-select space toggles the active option without advancing", () => {
	let state = createInitialState(sampleParams());
	state = toggleCurrentMultiOption(state);

	assert.equal(state.answers.lang.selected[0].label, "Python");
	assert.equal(state.activeTabIndex, 0);
	assert.equal(state.view.kind, "navigate");

	state = toggleCurrentMultiOption(state);
	assert.equal(state.answers.lang, undefined);
	assert.equal(state.activeTabIndex, 0);
	assert.equal(state.view.kind, "navigate");
});

test("submit can complete even when some questions are unanswered", () => {
	let state = createInitialState(sampleParams());
	state = moveTab(state, -1);
	assert.equal(state.view.kind, "submit");
	state = confirmCurrentSelection(state);

	assert.equal(state.completed, true);
	assert.equal(state.cancelled, false);
});

test("selecting other enters input mode and custom submit stores typed answer", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Other?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	state = applyNumberShortcut(state, 2);
	assert.equal(state.view.kind, "input");
	state = submitCustomAnswer(state, "my custom answer");

	assert.equal(state.answers.q1.customText, "my custom answer");
	assert.equal(state.view.kind, "submit");
});

test("escape saves typed custom answer without advancing", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Other?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	state = applyNumberShortcut(state, 2);
	assert.equal(state.view.kind, "input");
	state = saveCustomAnswer(state, "my draft answer");

	assert.equal(state.view.kind, "navigate");
	assert.equal(state.activeTabIndex, 0);
	assert.equal(state.answers.q1.customText, "my draft answer");
});

test("multi-select keeps existing selections when leaving custom input empty", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick frameworks",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
					{ value: "svelte", label: "Svelte" },
				],
			},
		],
	});

	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	state = applyNumberShortcut(state, 4);
	state = saveCustomAnswer(state, "   ");

	assert.deepEqual(
		state.answers.q1.selected.map((selection) => selection.value),
		["vue", "svelte"]
	);
	assert.equal(state.answers.q1.customText, undefined);
});

test("multi-select keeps existing selections when saving custom text", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick frameworks",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
			{
				id: "q2",
				prompt: "Anything else?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	state = toggleCurrentMultiOption(state);
	state = applyNumberShortcut(state, 3);
	state = submitCustomAnswer(state, "SolidStart");

	assert.equal(state.activeTabIndex, 1);
	assert.deepEqual(
		state.answers.q1.selected.map((selection) => selection.value),
		["react"]
	);
	assert.equal(state.answers.q1.customText, "SolidStart");
});

test("empty custom draft clears the stored answer but preserves notes", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Other?",
				options: [{ value: "a", label: "A" }],
			},
		],
	});

	state = enterQuestionNoteMode(state, "q1");
	state = saveNote(state, "question note");
	state = applyNumberShortcut(state, 2);
	state = saveCustomAnswer(state, "my answer");
	state = applyNumberShortcut(state, 2);
	state = saveCustomAnswer(state, "   ");

	assert.equal(state.answers.q1.customText, undefined);
	assert.equal(state.answers.q1.note, "question note");
	assert.equal(state.view.kind, "navigate");
});

test("question note can be saved without selecting an answer and is submitted", () => {
	let state = createInitialState({
		questions: [
			{ id: "q1", prompt: "Question?", options: [{ value: "a", label: "A" }] },
		],
	});

	state = enterQuestionNoteMode(state, "q1");
	assert.equal(state.view.kind, "note");
	state = saveNote(state, "needs examples");

	assert.equal(state.view.kind, "navigate");
	assert.equal(state.answers.q1.note, "needs examples");
	assert.deepEqual(toAskResult(state).answers.q1, {
		values: [],
		labels: [],
		indices: [],
		customText: undefined,
		note: "needs examples",
		optionNotes: undefined,
	});
});

test("option notes can exist before selection but only selected option notes are submitted", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick frameworks",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = enterOptionNoteMode(state, "q1", "vue");
	state = saveNote(state, "maybe later");
	assert.equal(state.answers.q1.optionNotes?.vue, "maybe later");
	assert.equal(toAskResult(state).answers.q1, undefined);

	state = toggleCurrentMultiOption(state);
	assert.deepEqual(
		state.answers.q1.selected.map((selection) => selection.value),
		["react"]
	);
	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	assert.deepEqual(
		state.answers.q1.selected.map((selection) => selection.value),
		["react", "vue"]
	);
	assert.deepEqual(toAskResult(state).answers.q1.optionNotes, {
		vue: "maybe later",
	});
});

test("deselecting an option keeps its note in state but omits it from submission", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick frameworks",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	state = enterOptionNoteMode(state, "q1", "vue");
	state = saveNote(state, "migration risk");
	state = toggleCurrentMultiOption(state);

	assert.equal(state.answers.q1.optionNotes?.vue, "migration risk");
	assert.equal(toAskResult(state).answers.q1, undefined);

	state = toggleCurrentMultiOption(state);
	assert.deepEqual(toAskResult(state).answers.q1, {
		values: ["vue"],
		labels: ["Vue"],
		indices: [2],
		customText: undefined,
		note: undefined,
		optionNotes: {
			vue: "migration risk",
		},
	});
});

test("multi-select keeps custom text when toggling additional options", () => {
	let state = createInitialState({
		questions: [
			{
				id: "q1",
				prompt: "Pick frameworks",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 3);
	state = saveCustomAnswer(state, "SolidStart");
	state = applyNumberShortcut(state, 1);

	assert.equal(state.answers.q1.customText, "SolidStart");
	assert.deepEqual(
		state.answers.q1.selected.map((selection) => selection.value),
		["react"]
	);
});

test("preview questions can store selected option notes for submission", () => {
	let state = createInitialState({
		questions: [
			{
				id: "preview",
				prompt: "Pick layout",
				type: "preview",
				options: [
					{ value: "compact", label: "Compact", preview: "A" },
					{ value: "spacious", label: "Spacious", preview: "B" },
				],
			},
		],
	});

	state = enterOptionNoteMode(state, "preview", "spacious");
	state = saveNote(state, "better scanability");
	state = applyNumberShortcut(state, 2);

	assert.deepEqual(toAskResult(state).answers.preview, {
		values: ["spacious"],
		labels: ["Spacious"],
		indices: [2],
		customText: undefined,
		note: undefined,
		optionNotes: {
			spacious: "better scanability",
		},
	});
});

test("tab navigation wraps including submit tab", () => {
	let state = createInitialState(sampleParams());
	state = moveTab(state, -1);
	assert.equal(state.activeTabIndex, 2);
	assert.equal(state.view.kind, "submit");

	state = moveTab(state, 1);
	assert.equal(state.activeTabIndex, 0);
	assert.equal(state.view.kind, "navigate");
});

test("tab navigation works with a single question", () => {
	let state = createInitialState({
		questions: [
			{ id: "q", prompt: "Q?", options: [{ value: "a", label: "A" }] },
		],
	});

	state = moveTab(state, -1);
	assert.equal(state.activeTabIndex, 1);
	assert.equal(state.view.kind, "submit");

	state = moveTab(state, 1);
	assert.equal(state.activeTabIndex, 0);
	assert.equal(state.view.kind, "navigate");
});

test("escape cancels from main flow but only exits input and note modes when editing", () => {
	let state = createInitialState(sampleParams());
	state = cancelFlow(state);
	assert.equal(state.cancelled, true);
	assert.equal(state.completed, true);

	state = createInitialState({
		questions: [
			{ id: "q", prompt: "Q?", options: [{ value: "a", label: "A" }] },
		],
	});
	state = applyNumberShortcut(state, 2);
	assert.equal(state.view.kind, "input");
	state = cancelFlow(state);
	assert.equal(state.view.kind, "navigate");
	assert.equal(state.cancelled, false);

	state = enterQuestionNoteMode(state, "q");
	assert.equal(state.view.kind, "note");
	state = cancelFlow(state);
	assert.equal(state.view.kind, "navigate");
	assert.equal(state.cancelled, false);
});

test("dismissFlow cancels the tool even from editing modes", () => {
	let state = createInitialState({
		questions: [
			{ id: "q", prompt: "Q?", options: [{ value: "a", label: "A" }] },
		],
	});
	state = applyNumberShortcut(state, 2);
	assert.equal(state.view.kind, "input");
	state = dismissFlow(state);
	assert.equal(state.cancelled, true);
	assert.equal(state.completed, true);

	state = createInitialState({
		questions: [
			{ id: "q", prompt: "Q?", options: [{ value: "a", label: "A" }] },
		],
	});
	state = enterQuestionNoteMode(state, "q");
	assert.equal(state.view.kind, "note");
	state = dismissFlow(state);
	assert.equal(state.cancelled, true);
	assert.equal(state.completed, true);
});
