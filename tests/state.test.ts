import assert from "node:assert/strict";
import test from "node:test";
import {
	applyNumberShortcut,
	cancelFlow,
	confirmCurrentSelection,
	createInitialState,
	saveCustomAnswer,
	getRenderableOptions,
	moveOption,
	moveTab,
	submitCustomAnswer,
	toggleCurrentMultiOption,
} from "../src/state.ts";
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
	assert.equal(state.questions[0].allowOther, true);
	assert.equal(state.questions[0].required, true);
	assert.equal(
		getRenderableOptions(state.questions[0]).at(-1)?.label,
		"Type your own",
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
		getRenderableOptions(state.questions[0]).at(-1)?.isOther,
		undefined,
	);
	assert.equal(getRenderableOptions(state.questions[0]).length, 1);
});

test("single-select number shortcut stores answer and advances to next tab", () => {
	let state = createInitialState(sampleParams());
	state = applyNumberShortcut(state, 2);

	assert.equal(state.answers.lang.labels[0], "TypeScript");
	assert.equal(state.currentTab, 1);
	assert.equal(state.mode, "navigate");
});

test("multi-select space toggles current option and enter advances to submit", () => {
	let state = createInitialState(sampleParams());
	state = applyNumberShortcut(state, 1);
	state = toggleCurrentMultiOption(state);
	assert.deepEqual(state.answers.fe.labels, ["React"]);

	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	assert.deepEqual(state.answers.fe.labels, ["React", "Vue"]);

	state = confirmCurrentSelection(state);
	assert.equal(state.mode, "submit");
	assert.equal(state.currentTab, 2);
	assert.equal(state.completed, false);
});

test("submit can complete even when some questions are unanswered", () => {
	let state = createInitialState(sampleParams());
	state = moveTab(state, -1);
	assert.equal(state.mode, "submit");
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
	assert.equal(state.mode, "input");
	state = submitCustomAnswer(state, "my custom answer");

	assert.equal(state.answers.q1.customText, "my custom answer");
	assert.equal(state.mode, "submit");
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
	assert.equal(state.mode, "input");
	state = saveCustomAnswer(state, "my draft answer");

	assert.equal(state.mode, "navigate");
	assert.equal(state.currentTab, 0);
	assert.equal(state.answers.q1.customText, "my draft answer");
});

test("empty custom draft clears the stored answer", () => {
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
	state = saveCustomAnswer(state, "my answer");
	state = applyNumberShortcut(state, 2);
	state = saveCustomAnswer(state, "   ");

	assert.equal(state.answers.q1, undefined);
	assert.equal(state.mode, "navigate");
});

test("tab navigation wraps including submit tab", () => {
	let state = createInitialState(sampleParams());
	state = moveTab(state, -1);
	assert.equal(state.currentTab, 2);
	assert.equal(state.mode, "submit");

	state = moveTab(state, 1);
	assert.equal(state.currentTab, 0);
	assert.equal(state.mode, "navigate");
});

test("tab navigation works with a single question", () => {
	let state = createInitialState({
		questions: [
			{ id: "q", prompt: "Q?", options: [{ value: "a", label: "A" }] },
		],
	});

	state = moveTab(state, -1);
	assert.equal(state.currentTab, 1);
	assert.equal(state.mode, "submit");

	state = moveTab(state, 1);
	assert.equal(state.currentTab, 0);
	assert.equal(state.mode, "navigate");
});

test("escape cancels from main flow but only exits input mode when typing", () => {
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
	assert.equal(state.mode, "input");
	state = cancelFlow(state);
	assert.equal(state.mode, "navigate");
	assert.equal(state.cancelled, false);
});
