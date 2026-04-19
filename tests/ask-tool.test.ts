import assert from "node:assert/strict";
import test from "node:test";
import { registerAskTool } from "../src/ask-tool.ts";
import type { AskParams } from "../src/types.ts";

const NON_INTERACTIVE_MESSAGE_RE =
	/Needs user input: ask_user requires interactive UI\./;
const FIRST_QUESTION_RE = /1\. Goal: What should I optimize for\?/;
const SPEED_OPTION_RE = /- Speed \[speed\]/;
const CUSTOM_OPTION_RE = /- Type your own \[custom\]/;
const DUPLICATE_ID_RE = /duplicate question id "scope"/;
const HAS_UI = "hasUI";
const noop = () => {
	// intentional test callback
};

function registerMockTool() {
	const tools: Record<string, unknown>[] = [];
	registerAskTool({
		registerTool(tool: unknown) {
			tools.push(tool as Record<string, unknown>);
		},
	} as never);
	return tools[0] as {
		execute: (...args: any[]) => Promise<any>;
		renderCall: (args: unknown, theme: any) => { text: string };
		renderResult: (
			result: any,
			options: unknown,
			theme: any
		) => { text: string };
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

test("ask tool returns pending questions in non-interactive mode", async () => {
	const tool = registerMockTool();

	const result = await tool.execute(
		"call-1",
		sampleParams(),
		undefined,
		noop,
		makeCtx(false)
	);

	assert.equal(result.details.cancelled, true);
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

test("ask tool rejects invalid payloads before UI opens", async () => {
	const tool = registerMockTool();

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
	assert.equal(result.details.questions.length, 0);
	assert.match(result.content[0].text, DUPLICATE_ID_RE);
});

test("ask tool transcript renderers summarize call and cancelled result", () => {
	const tool = registerMockTool();
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
				questions: [],
				answers: {},
			},
		},
		undefined,
		theme
	).text;
	assert.equal(resultText, "Cancelled");
});
