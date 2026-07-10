import assert from "node:assert/strict";
import test from "node:test";
import {
	collectExtractionBusinessIssues,
	parseExtractionCandidate,
	repairExtractionParams,
	selectExtractionModel,
} from "../src/answer-extraction.ts";

function model(provider: string, id: string) {
	return { provider, id } as never;
}

test("selectExtractionModel uses first configured model with auth", async () => {
	const first = model("missing", "a");
	const second = model("ok", "b");
	const result = await selectExtractionModel(
		{
			model: model("fallback", "c"),
			modelRegistry: {
				find(provider: string, _id: string) {
					if (provider === "missing") {
						return first;
					}
					if (provider === "ok") {
						return second;
					}
				},
				getApiKeyAndHeaders(candidate: { provider: string }) {
					if (candidate.provider === "ok") {
						return Promise.resolve({ ok: true, apiKey: "key" });
					}
					return Promise.resolve({ ok: false, error: "no" });
				},
			},
		} as never,
		[
			{ provider: "missing", id: "a" },
			{ provider: "ok", id: "b" },
		]
	);

	assert.deepEqual(result, {
		model: second,
		auth: { ok: true, apiKey: "key" },
		usedFallback: false,
	});
});

test("extraction business rules flag option spam", () => {
	const issues = collectExtractionBusinessIssues({
		questions: [
			{
				id: "q",
				prompt: "Pick one",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
					{ value: "c", label: "C" },
					{ value: "d", label: "D" },
					{ value: "e", label: "E" },
				],
			},
		],
	});

	assert.deepEqual(issues, ["questions[0].options has 5 items; max is 4"]);
});

test("repairExtractionParams caps options while preserving other", () => {
	const repaired = repairExtractionParams({
		questions: [
			{
				id: "q",
				prompt: "Pick one",
				options: [
					{ value: "a", label: "A" },
					{ value: "b", label: "B" },
					{ value: "c", label: "C" },
					{ value: "d", label: "D" },
					{ value: "other", label: "Other" },
				],
			},
		],
	});

	assert.deepEqual(
		repaired.questions[0]?.options.map((option) => option.value),
		["a", "b", "c", "other"]
	);
});

test("repairExtractionParams drops generic conversational prompts", () => {
	const repaired = repairExtractionParams({
		questions: [
			{
				id: "generic",
				prompt: "How can I help you today?",
				options: [{ value: "help", label: "Help me" }],
			},
		],
	});

	assert.deepEqual(repaired.questions, []);
});

test("selectExtractionModel validates fallback model auth", async () => {
	const fallback = model("fallback", "c");
	const result = await selectExtractionModel(
		{
			model: fallback,
			modelRegistry: {
				find() {
					return;
				},
				getApiKeyAndHeaders() {
					return Promise.resolve({ ok: false, error: "no auth" });
				},
			},
		} as never,
		[]
	);

	assert.deepEqual(result, {
		error: "No auth for fallback chat model: fallback/c.",
	});
});

const NO_TEXT_CONTENT_ERROR = /no text content/i;
const QUESTIONS_MUST_BE_ARRAY_ERROR = /questions must be an array/;

test("parseExtractionCandidate accepts raw JSON", () => {
	const result = parseExtractionCandidate('{"questions":[]}');
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.params.questions.length, 0);
	}
});

test("parseExtractionCandidate strips ```json code fences", () => {
	const result = parseExtractionCandidate('```json\n{"questions":[]}\n```');
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.params.questions.length, 0);
	}
});

test("parseExtractionCandidate strips bare ``` code fences", () => {
	const result = parseExtractionCandidate('```\n{"questions":[]}\n```');
	assert.equal(result.ok, true);
});

test("parseExtractionCandidate extracts JSON from surrounding prose", () => {
	const input =
		'Here is the JSON:\n{"questions":[{"id":"x","prompt":"y","options":[{"value":"a","label":"A"}]}]}\nDone.';
	const result = parseExtractionCandidate(input);
	assert.equal(result.ok, true);
	if (result.ok) {
		assert.equal(result.params.questions.length, 1);
	}
});

test("parseExtractionCandidate handles braces inside string values", () => {
	const input =
		'{"questions":[{"id":"x","prompt":"a \\"quoted { brace\\" }","options":[{"value":"a","label":"A"}]}]}';
	const result = parseExtractionCandidate(input);
	assert.equal(result.ok, true);
});

test("parseExtractionCandidate reports empty responses as a distinct error", () => {
	const result = parseExtractionCandidate("");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.match(result.error, NO_TEXT_CONTENT_ERROR);
	}
});

test("parseExtractionCandidate reports whitespace-only responses as empty", () => {
	const result = parseExtractionCandidate("   \n\t  \n");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.match(result.error, NO_TEXT_CONTENT_ERROR);
	}
});

test("parseExtractionCandidate rejects non-object roots", () => {
	const result = parseExtractionCandidate("[1,2,3]");
	assert.equal(result.ok, false);
	if (!result.ok) {
		assert.match(result.error, QUESTIONS_MUST_BE_ARRAY_ERROR);
	}
});
