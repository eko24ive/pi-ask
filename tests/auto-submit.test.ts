import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import type { AskConfig } from "../src/config/schema.ts";
import { createInitialState } from "../src/state/create.ts";
import { saveNote } from "../src/state/transitions.ts";
import type { AskState } from "../src/types.ts";
import { maybeAutoSubmitState } from "../src/ui/auto-submit.ts";

const enabledConfig: AskConfig = {
	...DEFAULT_ASK_CONFIG,
	behaviour: {
		...DEFAULT_ASK_CONFIG.behaviour,
		autoSubmitWhenAnsweredWithoutNotes: true,
	},
};

const disabledConfig: AskConfig = {
	...DEFAULT_ASK_CONFIG,
	behaviour: {
		...DEFAULT_ASK_CONFIG.behaviour,
		autoSubmitWhenAnsweredWithoutNotes: false,
	},
};

function answeredSubmitState(): AskState {
	return {
		...createInitialState({
			questions: [
				{
					id: "q1",
					label: "Q1",
					options: [{ label: "Option A", value: "a" }],
					prompt: "Pick one",
					required: false,
					type: "single",
				},
			],
		}),
		activeTabIndex: 1,
		answers: {
			q1: {
				selected: [{ index: 1, label: "Option A", value: "a" }],
			},
		},
		view: { kind: "submit" },
	};
}

test("auto submit completes answered submit-tab state when enabled", () => {
	const state = maybeAutoSubmitState(answeredSubmitState(), enabledConfig);

	assert.equal(state.completed, true);
	assert.equal(state.mode, "submit");
});

test("auto submit does nothing when disabled", () => {
	const state = maybeAutoSubmitState(answeredSubmitState(), disabledConfig);

	assert.equal(state.completed, false);
});

test("auto submit does not trigger when notes exist", () => {
	const stateWithNote = saveNote(
		{ ...answeredSubmitState(), view: { kind: "note", questionId: "q1" } },
		"Need more detail"
	);
	const submitState: AskState = {
		...stateWithNote,
		activeTabIndex: 1,
		view: { kind: "submit" },
	};
	const state = maybeAutoSubmitState(submitState, enabledConfig);

	assert.equal(state.completed, false);
});
