import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { createInitialState } from "../src/state/create.ts";
import {
	applyNumberShortcut,
	enterQuestionNoteMode,
} from "../src/state/transitions.ts";
import {
	hasDirtyFlowState,
	shouldConfirmDirtyDismiss,
	shouldDiscardAfterConfirmation,
} from "../src/ui/dismiss-guard.ts";

test("dirty flow state is false for untouched ask flow", () => {
	const state = createInitialState({
		questions: [
			{ id: "q1", prompt: "Question?", options: [{ value: "a", label: "A" }] },
		],
	});

	assert.equal(hasDirtyFlowState(state), false);
});

test("dirty flow state is true for saved answers or editor drafts", () => {
	const base = createInitialState({
		questions: [
			{ id: "q1", prompt: "Question?", options: [{ value: "a", label: "A" }] },
		],
	});
	const answered = applyNumberShortcut(base, 1);
	const noteEditing = enterQuestionNoteMode(base, "q1");

	assert.equal(hasDirtyFlowState(answered), true);
	assert.equal(hasDirtyFlowState(noteEditing, "draft note"), true);
});

test("confirm dismiss when dirty is opt-in and respects dirty state", () => {
	const state = applyNumberShortcut(
		createInitialState({
			questions: [
				{
					id: "q1",
					prompt: "Question?",
					options: [{ value: "a", label: "A" }],
				},
			],
		}),
		1
	);
	const enabledConfig = {
		...DEFAULT_ASK_CONFIG,
		behaviour: {
			...DEFAULT_ASK_CONFIG.behaviour,
			confirmDismissWhenDirty: true,
		},
	};

	assert.equal(
		shouldConfirmDirtyDismiss({ config: DEFAULT_ASK_CONFIG, state }),
		false
	);
	assert.equal(
		shouldConfirmDirtyDismiss({ config: enabledConfig, state }),
		true
	);
});

test("dismiss confirmation is active while pending", () => {
	assert.equal(shouldDiscardAfterConfirmation(false), false);
	assert.equal(shouldDiscardAfterConfirmation(true), true);
});
