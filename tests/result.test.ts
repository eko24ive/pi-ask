import assert from "node:assert/strict";
import test from "node:test";
import { renderResultText } from "../src/result.ts";
import { createInitialState } from "../src/state/create.ts";
import { summarizeResult, toAskResult } from "../src/state/result.ts";
import {
	applyNumberShortcut,
	confirmCurrentSelection,
	enterOptionNoteMode,
	enterQuestionNoteMode,
	moveOption,
	moveTab,
	saveNote,
	submitCustomAnswer,
	toggleCurrentMultiOption,
} from "../src/state/transitions.ts";

test("summarizeResult formats selected answers", () => {
	let state = createInitialState({
		questions: [
			{
				id: "style",
				label: "Style",
				prompt: "How should I frame it?",
				options: [
					{ value: "minimal", label: "Minimal" },
					{ value: "rich", label: "Rich" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 2);
	const result = toAskResult(state);

	assert.equal(summarizeResult(result), "Style: Rich");
	assert.equal(renderResultText(result), "✓ Style: Rich");
});

test("submitted results surface unanswered questions without serializing answers", () => {
	let state = createInitialState({
		questions: [
			{
				id: "architecture",
				label: "Architecture",
				prompt: "How should we wire secrets?",
				options: [{ value: "encrypted", label: "Encrypted" }],
			},
			{
				id: "sources",
				label: "Secret sources",
				prompt: "Where do secrets come from?",
				type: "multi",
				options: [{ value: "env", label: ".env file" }],
			},
		],
	});

	state = applyNumberShortcut(state, 1);
	state = confirmCurrentSelection(state);
	state = confirmCurrentSelection(state);
	const result = toAskResult(state);

	assert.equal(result.answers.sources, undefined);
	assert.equal(
		summarizeResult(result),
		"Architecture: Encrypted\nSecret sources: (no answer)"
	);
	assert.equal(
		renderResultText(result),
		"✓ Architecture: Encrypted\n? Secret sources: (no answer)"
	);
});

test("submitted results surface every question when all are unanswered", () => {
	const result = {
		cancelled: false,
		mode: "submit" as const,
		questions: [
			{
				id: "scope",
				label: "Scope",
				prompt: "What scope?",
				type: "single" as const,
			},
			{
				id: "tests",
				label: "Tests",
				prompt: "Which tests?",
				type: "multi" as const,
			},
		],
		answers: {},
	};
	assert.equal(
		summarizeResult(result),
		"Scope: (no answer)\nTests: (no answer)"
	);
	assert.equal(
		renderResultText(result),
		"? Scope: (no answer)\n? Tests: (no answer)"
	);
});

test("single questions presented as multi preserve requested type in results", () => {
	let state = createInitialState(
		{
			questions: [
				{
					id: "scope",
					label: "Scope",
					prompt: "What scope?",
					options: [
						{ value: "docs", label: "Docs" },
						{ value: "tests", label: "Tests" },
					],
				},
			],
		},
		{ presentSingleAsMulti: true }
	);

	state = toggleCurrentMultiOption(state);
	state = moveOption(state, 1);
	state = toggleCurrentMultiOption(state);
	const result = toAskResult(state);

	assert.deepEqual(result.questions, [
		{
			id: "scope",
			label: "Scope",
			prompt: "What scope?",
			type: "single",
			presentedType: "multi",
		},
	]);
	assert.equal(
		summarizeResult(result),
		"Scope: Docs, Tests\nNote: Some questions were presented as multi-select by user preference."
	);
	assert.equal(
		renderResultText(result),
		"✓ Scope: Docs, Tests\n  Note: Some questions were presented as multi-select by user preference."
	);
});

test("presentation override summary uses one compact note", () => {
	const result = {
		cancelled: false,
		mode: "submit" as const,
		questions: [
			{
				id: "apiStyle",
				label: "Single Select",
				prompt: "Pick one API style.",
				type: "single" as const,
				presentedType: "multi" as const,
			},
			{
				id: "docsSections",
				label: "Multi Select",
				prompt: "Which docs sections should be updated?",
				type: "multi" as const,
			},
			{
				id: "layout",
				label: "Preview",
				prompt: "Choose a layout with preview content.",
				type: "preview" as const,
				presentedType: "multi" as const,
			},
		],
		answers: {
			apiStyle: {
				values: ["rest", "graphql"],
				labels: ["REST", "GraphQL"],
				indices: [1, 2],
			},
			docsSections: {
				values: ["readme", "contract", "architecture"],
				labels: ["README", "Contract", "Architecture"],
				indices: [1, 2, 3],
			},
			layout: {
				values: ["compact", "detailed"],
				labels: ["Compact", "Detailed"],
				indices: [1, 2],
			},
		},
	};

	assert.equal(
		summarizeResult(result),
		[
			"Single Select: REST, GraphQL",
			"Multi Select: README, Contract, Architecture",
			"Preview: Compact, Detailed",
			"Note: Some questions were presented as multi-select by user preference.",
		].join("\n")
	);
});

test("summaries include custom text answers", () => {
	let state = createInitialState({
		questions: [
			{
				id: "notes",
				label: "Notes",
				prompt: "Anything else?",
				options: [{ value: "none", label: "None" }],
			},
		],
	});

	state = applyNumberShortcut(state, 2);
	state = submitCustomAnswer(state, "Please include examples");
	const result = toAskResult(state);

	assert.equal(summarizeResult(result), "Notes: Please include examples");
	assert.equal(
		renderResultText(result),
		"✓ Notes: (wrote) Please include examples"
	);
});

test("multi-select summaries include selected options and custom text", () => {
	let state = createInitialState({
		questions: [
			{
				id: "frameworks",
				label: "Frameworks",
				prompt: "Which frameworks?",
				type: "multi",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 1);
	state = applyNumberShortcut(state, 3);
	state = submitCustomAnswer(state, "SolidStart");
	const result = toAskResult(state);

	assert.deepEqual(result.answers.frameworks, {
		values: ["react", "SolidStart"],
		labels: ["React", "SolidStart"],
		indices: [1],
		customText: "SolidStart",
		note: undefined,
		optionNotes: undefined,
	});
	assert.equal(summarizeResult(result), "Frameworks: React, SolidStart");
	assert.equal(renderResultText(result), "✓ Frameworks: React, SolidStart");
});

test("summaries and result text include question and selected option notes", () => {
	let state = createInitialState({
		questions: [
			{
				id: "framework",
				label: "Framework",
				prompt: "Pick a framework",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = enterQuestionNoteMode(state, "framework");
	state = saveNote(state, "Need SSR support");
	state = enterOptionNoteMode(state, "framework", "vue");
	state = saveNote(state, "Team has prior experience");
	state = applyNumberShortcut(state, 2);
	const result = toAskResult(state);

	assert.equal(
		summarizeResult(result),
		[
			"Framework: Vue",
			"Framework note: Need SSR support",
			"Framework / Vue note: Team has prior experience",
		].join("\n")
	);
	assert.equal(
		renderResultText(result),
		[
			"✓ Framework: Vue",
			"  note: Need SSR support",
			"  Vue note: Team has prior experience",
		].join("\n")
	);
});

test("unselected option notes are omitted from the submitted result", () => {
	let state = createInitialState({
		questions: [
			{
				id: "framework",
				label: "Framework",
				prompt: "Pick a framework",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = enterOptionNoteMode(state, "framework", "react");
	state = saveNote(state, "Only for legacy projects");
	state = applyNumberShortcut(state, 2);
	const result = toAskResult(state);

	assert.equal(result.answers.framework.optionNotes, undefined);
	assert.equal(renderResultText(result), "✓ Framework: Vue");
});

test("question-note-only results still render note content", () => {
	const result = {
		title: "Interview",
		cancelled: false,
		mode: "submit" as const,
		questions: [
			{
				id: "scope",
				label: "Scope",
				prompt: "What should we focus on?",
				type: "single" as const,
			},
		],
		answers: {
			scope: {
				values: [],
				labels: [],
				indices: [],
				note: "Prefer incremental changes",
			},
		},
	};

	assert.equal(renderResultText(result), "  note: Prefer incremental changes");
});

test("elaborate results include unselected notes in summary and render output", () => {
	let state = createInitialState({
		questions: [
			{
				id: "framework",
				label: "Framework",
				prompt: "Pick a framework",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = enterQuestionNoteMode(state, "framework");
	state = saveNote(state, "Need SSR support");
	state = enterOptionNoteMode(state, "framework", "react");
	state = saveNote(state, "Legacy codebase");
	state = { ...state, mode: "elaborate" };
	const result = toAskResult(state);

	assert.equal(result.mode, "elaborate");
	assert.deepEqual(result.answers, {});
	assert.deepEqual(result.continuation, {
		affectedQuestionIds: ["framework"],
		preservedAnswers: {},
		questionStates: {
			framework: { status: "needs_clarification" },
		},
		strategy: "refine_only",
	});
	assert.deepEqual(result.elaboration, {
		instruction:
			"First answer the user's noted clarification directly and concisely using the provided question and option context. Do not treat these notes as final answers. Then re-ask only the affected questions if a choice is still needed afterward. Do not jump straight to a follow-up question unless the note is already resolved.",
		nextAction: "clarify_then_reask",
		items: [
			{
				target: { kind: "question" },
				question: {
					id: "framework",
					label: "Framework",
					prompt: "Pick a framework",
					type: "single",
					options: [
						{ value: "react", label: "React" },
						{ value: "vue", label: "Vue" },
					],
				},
				answered: false,
				answer: undefined,
				note: "Need SSR support",
			},
			{
				target: {
					kind: "option",
					optionValue: "react",
				},
				question: {
					id: "framework",
					label: "Framework",
					prompt: "Pick a framework",
					type: "single",
					options: [
						{ value: "react", label: "React" },
						{ value: "vue", label: "Vue" },
					],
				},
				option: { value: "react", label: "React" },
				selected: false,
				answered: false,
				answer: undefined,
				note: "Legacy codebase",
			},
		],
	});
	assert.equal(
		summarizeResult(result),
		[
			'User asked to elaborate on question "Pick a framework" with note "Need SSR support"',
			'User asked to elaborate on question "Pick a framework" option "React" with note "Legacy codebase"',
		].join("\n")
	);
	assert.equal(
		renderResultText(result),
		[
			'User asked to elaborate on question "Pick a framework" with note "Need SSR support"',
			'User asked to elaborate on question "Pick a framework" option "React" with note "Legacy codebase"',
		].join("\n")
	);
});

test("elaborate results keep committed answers alongside elaboration context", () => {
	let state = createInitialState({
		questions: [
			{
				id: "framework",
				label: "Framework",
				prompt: "Pick a framework",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 2);
	state = enterQuestionNoteMode(state, "framework");
	state = saveNote(state, "Compare tradeoffs");
	state = { ...state, mode: "elaborate" };
	const result = toAskResult(state);

	assert.deepEqual(result.continuation, {
		affectedQuestionIds: ["framework"],
		preservedAnswers: {},
		questionStates: {
			framework: { status: "needs_clarification" },
		},
		strategy: "refine_only",
	});
	assert.deepEqual(result.answers, {
		framework: {
			values: ["vue"],
			labels: ["Vue"],
			indices: [2],
			customText: undefined,
			note: "Compare tradeoffs",
			optionNotes: undefined,
		},
	});
	assert.deepEqual(result.elaboration?.items[0], {
		target: { kind: "question" },
		question: {
			id: "framework",
			label: "Framework",
			prompt: "Pick a framework",
			type: "single",
			options: [
				{ value: "react", label: "React" },
				{ value: "vue", label: "Vue" },
			],
		},
		answered: true,
		answer: {
			values: ["vue"],
			labels: ["Vue"],
			indices: [2],
			customText: undefined,
			note: "Compare tradeoffs",
			optionNotes: undefined,
		},
		note: "Compare tradeoffs",
	});
	assert.equal(
		summarizeResult(result),
		'User asked to elaborate on question "Pick a framework" after current answer "Vue" with note "Compare tradeoffs"'
	);
	assert.equal(
		renderResultText(result),
		'User asked to elaborate on question "Pick a framework" after current answer "Vue" with note "Compare tradeoffs"'
	);
});

test("elaboration summary includes custom answers in note context", () => {
	let state = createInitialState({
		questions: [
			{
				id: "framework",
				label: "Framework",
				prompt: "Pick a framework",
				options: [
					{ value: "react", label: "React" },
					{ value: "vue", label: "Vue" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 3);
	state = submitCustomAnswer(state, "SolidStart");
	state = enterQuestionNoteMode(state, "framework");
	state = saveNote(state, "Compare tradeoffs");
	state = { ...state, mode: "elaborate" };
	const result = toAskResult(state);

	assert.equal(
		summarizeResult(result),
		'User asked to elaborate on question "Pick a framework" after current answer "SolidStart" with note "Compare tradeoffs"'
	);
	assert.equal(
		renderResultText(result),
		'User asked to elaborate on question "Pick a framework" after current answer "SolidStart" with note "Compare tradeoffs"'
	);
	assert.deepEqual(result.elaboration?.items[0]?.answer, {
		values: ["SolidStart"],
		labels: ["SolidStart"],
		indices: [],
		customText: "SolidStart",
		note: "Compare tradeoffs",
		optionNotes: undefined,
	});
});

test("elaboration summary includes answered custom text even without notes", () => {
	let state = createInitialState({
		questions: [
			{
				id: "demo_goal",
				label: "Goal",
				prompt: "What kind of ask_user showcase would you like?",
				options: [
					{ value: "simple-demo", label: "Simple demo" },
					{ value: "code-example", label: "Code example" },
				],
			},
		],
	});

	state = applyNumberShortcut(state, 3);
	state = submitCustomAnswer(state, "teeeel meee whyyyyy");
	state = { ...state, mode: "elaborate" };
	const result = toAskResult(state);

	assert.equal(
		summarizeResult(result),
		'User asked to elaborate on question "What kind of ask_user showcase would you like?" after current answer "teeeel meee whyyyyy"'
	);
	assert.equal(
		renderResultText(result),
		'User asked to elaborate on question "What kind of ask_user showcase would you like?" after current answer "teeeel meee whyyyyy"'
	);
	assert.deepEqual(result.elaboration?.items, []);
});

test("elaborate continuation preserves unrelated committed answers", () => {
	let state = createInitialState({
		questions: [
			{
				id: "goal",
				label: "Goal",
				prompt: "Pick goal",
				options: [
					{ value: "fast", label: "Fast" },
					{ value: "safe", label: "Safe" },
				],
			},
			{
				id: "constraints",
				label: "Constraints",
				prompt: "Pick constraints",
				type: "multi",
				options: [
					{ value: "small", label: "Small diff" },
					{ value: "tests", label: "Add tests" },
				],
			},
		],
	});

	state = enterQuestionNoteMode(state, "goal");
	state = saveNote(state, "Explain tradeoff");
	state = moveTab(state, 1);
	state = applyNumberShortcut(state, 1);
	state = applyNumberShortcut(state, 2);
	state = { ...state, mode: "elaborate" };
	const result = toAskResult(state);

	assert.deepEqual(result.continuation, {
		affectedQuestionIds: ["goal"],
		preservedAnswers: {
			constraints: {
				values: ["small", "tests"],
				labels: ["Small diff", "Add tests"],
				indices: [1, 2],
				customText: undefined,
				note: undefined,
				optionNotes: undefined,
			},
		},
		questionStates: {
			goal: { status: "needs_clarification" },
			constraints: { status: "answered" },
		},
		strategy: "refine_only",
	});
});

test("invalid tool payload result is attributed to the tool call", () => {
	const result = {
		title: "Interview",
		cancelled: true,
		mode: "submit" as const,
		questions: [],
		answers: {},
		error: {
			kind: "invalid_input" as const,
			issues: [],
		},
	};

	assert.equal(renderResultText(result), "Invalid tool payload");
});

test("cancelled result hides unanswered questions", () => {
	const result = {
		title: "Interview",
		cancelled: true,
		mode: "submit" as const,
		questions: [
			{
				id: "scope",
				label: "Scope",
				prompt: "What scope?",
				type: "single" as const,
			},
		],
		answers: {},
	};

	assert.equal(summarizeResult(result), "User cancelled the ask flow");
	assert.equal(renderResultText(result), "Cancelled");
});
