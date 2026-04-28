import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { createInitialState } from "../src/state/create.ts";
import { moveOption, moveTab } from "../src/state/transitions.ts";
import { renderAskScreen } from "../src/ui/render.ts";

function mockEditor() {
	return {
		getText() {
			return "";
		},
		render() {
			return [];
		},
	} as never;
}

function plainTheme() {
	return {
		fg(_color: string, text: string) {
			return text;
		},
		bg(_color: string, text: string) {
			return text;
		},
		bold(text: string) {
			return text;
		},
	} as never;
}

const notice =
	"Unsaved ask answers or drafts. Press cancel/dismiss again to discard.";

test("dismiss notice stays visible on same tab and clears after tab change", () => {
	const state = createInitialState({
		questions: [
			{
				id: "q1",
				label: "One",
				prompt: "One",
				options: [{ value: "a", label: "A" }],
			},
			{
				id: "q2",
				label: "Two",
				prompt: "Two",
				options: [{ value: "b", label: "B" }],
			},
		],
	});
	const config = {
		...DEFAULT_ASK_CONFIG,
		behaviour: {
			...DEFAULT_ASK_CONFIG.behaviour,
			confirmDismissWhenDirty: true,
		},
	};

	const sameTabLines = renderAskScreen({
		config,
		footerNotice: notice,
		state: moveOption(state, 1),
		theme: plainTheme(),
		width: 80,
		editor: mockEditor(),
	});
	assert.equal(sameTabLines.join("\n").includes(notice), true);

	const nextTabLines = renderAskScreen({
		config,
		state: moveTab(state, 1),
		theme: plainTheme(),
		width: 80,
		editor: mockEditor(),
	});
	assert.equal(nextTabLines.join("\n").includes(notice), false);
});
