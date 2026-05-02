import assert from "node:assert/strict";
import test from "node:test";
import { registerAskTool } from "../src/ask-tool.ts";
import type { AskParams } from "../src/types.ts";

const NON_INTERACTIVE_MESSAGE_RE =
	/Needs user input: ask_user requires interactive UI\./;
const FIRST_QUESTION_RE = /1\. Goal: What should I optimize for\?/;
const SPEED_OPTION_RE = /- Speed \[speed\]/;
const CUSTOM_OPTION_RE = /- Type your own \[custom\]/;
const DUPLICATE_ID_RE =
	/questions\[1\]\.id: Question 2: duplicate question id "scope"/;
const PREVIEW_RULE_RE =
	/questions\[0\]\.options\[0\]\.preview: Question 1, option 1: preview questions require preview text for every option; add preview text or use type "single" instead/;
const MISSING_OPTION_VALUE_RE =
	/questions\[0\]\.options\[0\]\.value: Question 1, option 1: value is required/;
const EMPTY_QUESTIONS_RE = /questions: At least one question is required/;
const INVALID_TYPE_RE =
	/questions\[0\]\.type: Question 1: invalid type "grid"; expected "single", "multi", or "preview"/;
const HAS_UI = "hasUI";
const noop = () => {
	// intentional test callback
};

function registerMockTool() {
	const tools: Record<string, unknown>[] = [];
	const entries: Array<{ customType: string; data: unknown }> = [];
	registerAskTool({
		appendEntry(customType: string, data: unknown) {
			entries.push({ customType, data });
		},
		registerTool(tool: unknown) {
			tools.push(tool as Record<string, unknown>);
		},
	} as never);
	return {
		entries,
		tool: tools[0] as {
			execute: (...args: any[]) => Promise<any>;
			renderCall: (args: unknown, theme: any) => { text: string };
			renderResult: (
				result: any,
				options: unknown,
				theme: any
			) => { text: string };
		},
	};
}

function makeCtx(hasUi: boolean): unknown {
	return { [HAS_UI]: hasUi };
}

function sampleParams(): AskParams {
	return {
		title: "Clarify next step",
		questions: [
			{
				id: "goal",
				label: "Goal",
				prompt: "What should I optimize for?",
				options: [
					{ value: "speed", label: "Speed" },
					{ value: "safety", label: "Safety" },
				],
			},
		],
	};
}

test("ask tool stores valid payloads as soon as they are called", async () => {
	const { entries, tool } = registerMockTool();
	const params = sampleParams();

	await tool.execute("call-1", params, undefined, noop, makeCtx(false));

	assert.equal(entries.length, 1);
	assert.equal(entries[0].customType, "ask:payload");
	assert.deepEqual(entries[0].data, {
		version: 1,
		source: "tool",
		params,
		sourceEntryId: "call-1",
		timestamp: (entries[0].data as { timestamp: number }).timestamp,
	});
});

test("ask tool returns pending questions in non-interactive mode", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		sampleParams(),
		undefined,
		noop,
		makeCtx(false)
	);

	assert.equal(result.details.cancelled, true);
	assert.equal(result.details.mode, "submit");
	assert.deepEqual(result.details.questions, [
		{
			id: "goal",
			label: "Goal",
			prompt: "What should I optimize for?",
			type: "single",
		},
	]);
	assert.deepEqual(result.details.answers, {});
	assert.match(result.content[0].text, NON_INTERACTIVE_MESSAGE_RE);
	assert.match(result.content[0].text, FIRST_QUESTION_RE);
	assert.match(result.content[0].text, SPEED_OPTION_RE);
	assert.match(result.content[0].text, CUSTOM_OPTION_RE);
});

test("ask tool includes custom answer fallback for preview questions", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [
				{
					id: "layout",
					label: "Layout",
					prompt: "Which layout?",
					type: "preview",
					options: [{ value: "compact", label: "Compact", preview: "A" }],
				},
			],
		},
		undefined,
		noop,
		makeCtx(false)
	);

	assert.match(result.content[0].text, CUSTOM_OPTION_RE);
});

test("ask tool rejects invalid payloads before UI opens with structured issues", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [
				{
					id: "scope",
					prompt: "Pick scope",
					options: [{ value: "small", label: "Small" }],
				},
				{
					id: "scope",
					prompt: "Pick tone",
					options: [{ value: "direct", label: "Direct" }],
				},
			],
		},
		undefined,
		noop,
		makeCtx(true)
	);

	assert.equal(result.details.cancelled, true);
	assert.equal(result.details.mode, "submit");
	assert.equal(result.details.questions.length, 0);
	assert.deepEqual(result.details.error, {
		kind: "invalid_input",
		issues: [
			{
				path: "questions[1].id",
				message: 'Question 2: duplicate question id "scope"',
			},
		],
	});
	assert.match(result.content[0].text, DUPLICATE_ID_RE);
});

test("ask tool reports missing option values with structured issues", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [
				{
					id: "api_style",
					prompt: "Pick API style",
					options: [{ label: "REST" } as never],
				},
			],
		},
		undefined,
		noop,
		makeCtx(true)
	);

	assert.equal(result.details.cancelled, true);
	assert.deepEqual(result.details.error, {
		kind: "invalid_input",
		issues: [
			{
				path: "questions[0].options[0].value",
				message: "Question 1, option 1: value is required",
			},
		],
	});
	assert.match(result.content[0].text, MISSING_OPTION_VALUE_RE);
});

test("ask tool reports empty questions with structured issues", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [],
		},
		undefined,
		noop,
		makeCtx(true)
	);

	assert.equal(result.details.cancelled, true);
	assert.deepEqual(result.details.error, {
		kind: "invalid_input",
		issues: [
			{
				path: "questions",
				message: "At least one question is required",
			},
		],
	});
	assert.match(result.content[0].text, EMPTY_QUESTIONS_RE);
});

test("ask tool reports invalid question types with structured issues", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [
				{
					id: "layout",
					prompt: "Pick layout",
					type: "grid" as never,
					options: [{ value: "compact", label: "Compact" }],
				},
			],
		},
		undefined,
		noop,
		makeCtx(true)
	);

	assert.equal(result.details.cancelled, true);
	assert.deepEqual(result.details.error, {
		kind: "invalid_input",
		issues: [
			{
				path: "questions[0].type",
				message:
					'Question 1: invalid type "grid"; expected "single", "multi", or "preview"',
			},
		],
	});
	assert.match(result.content[0].text, INVALID_TYPE_RE);
});

test("ask tool reports preview validation with structured issues", async () => {
	const { tool } = registerMockTool();

	const result = await tool.execute(
		"call-1",
		{
			title: "Clarify",
			questions: [
				{
					id: "layout",
					prompt: "Pick layout",
					type: "preview",
					options: [{ value: "compact", label: "Compact" }],
				},
			],
		},
		undefined,
		noop,
		makeCtx(true)
	);

	assert.equal(result.details.cancelled, true);
	assert.deepEqual(result.details.error, {
		kind: "invalid_input",
		issues: [
			{
				path: "questions[0].options[0].preview",
				message:
					'Question 1, option 1: preview questions require preview text for every option; add preview text or use type "single" instead',
			},
		],
	});
	assert.match(result.content[0].text, PREVIEW_RULE_RE);
});

test("ask tool transcript renderers summarize call and cancelled result", () => {
	const { tool } = registerMockTool();
	const theme = {
		bold: (text: string) => text,
		fg: (_token: string, text: string) => text,
	};

	const callText = tool.renderCall(
		{
			questions: [
				{ label: "Goal", options: [], prompt: "Q?", id: "goal" },
				{ label: "Tone", options: [], prompt: "Q?", id: "tone" },
			],
		},
		theme
	).text;
	assert.equal(callText, "ask_user 2 question(s) (Goal, Tone)");

	const resultText = tool.renderResult(
		{
			content: [{ type: "text", text: "ignored" }],
			details: {
				cancelled: true,
				mode: "submit",
				questions: [],
				answers: {},
			},
		},
		undefined,
		theme
	).text;
	assert.equal(resultText, "Cancelled");

	const invalidText = tool.renderResult(
		{
			content: [{ type: "text", text: "ignored" }],
			details: {
				cancelled: true,
				mode: "submit",
				questions: [],
				answers: {},
				error: {
					kind: "invalid_input",
					issues: [],
				},
			},
		},
		undefined,
		theme
	).text;
	assert.equal(invalidText, "Invalid input");
});
