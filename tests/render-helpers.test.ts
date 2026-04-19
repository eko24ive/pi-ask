import assert from "node:assert/strict";
import test from "node:test";
import { renderEditorBlock } from "../src/ui/render-helpers.ts";

const ABC_PATTERN = /abc/;
const BORDER_PATTERN = /┌|└/;
const TYPE_YOUR_PATTERN = /Type your/;
const SELECTED_BG_PATTERN = /\{selectedBg\}/;

function mockTheme() {
	return {
		fg(color: string, text: string) {
			return `<${color}>${text}</${color}>`;
		},
		bg(color: string, text: string) {
			return `{${color}}${text}{/${color}}`;
		},
	};
}

test("renderEditorBlock strips editor borders", () => {
	const lines: string[] = [];
	renderEditorBlock({
		lines,
		editorLines: ["┌──┐", "abc", "└──┘"],
		width: 40,
		theme: mockTheme() as never,
		indent: "   ",
		availableWidth: 40,
	});

	assert.equal(lines.length, 1);
	assert.match(lines[0], ABC_PATTERN);
	assert.match(lines[0], SELECTED_BG_PATTERN);
	assert.doesNotMatch(lines[0], BORDER_PATTERN);
});

test("renderEditorBlock shows a muted placeholder when empty", () => {
	const lines: string[] = [];
	renderEditorBlock({
		lines,
		editorLines: ["┌──┐", "  ", "└──┘"],
		width: 40,
		theme: mockTheme() as never,
		indent: "   ",
		availableWidth: 40,
		placeholder: "Type your",
		isEmpty: true,
	});

	assert.equal(lines.length, 1);
	assert.match(lines[0], TYPE_YOUR_PATTERN);
	assert.match(lines[0], SELECTED_BG_PATTERN);
	assert.doesNotMatch(lines[0], BORDER_PATTERN);
});

test("renderEditorBlock reapplies background after editor reset sequences", () => {
	const lines: string[] = [];
	renderEditorBlock({
		lines,
		editorLines: ["┌──┐", "abc\x1b[7m \x1b[0m", "└──┘"],
		width: 40,
		theme: mockTheme() as never,
		indent: "   ",
		availableWidth: 40,
	});

	assert.equal(lines.length, 1);
	assert.match(lines[0], SELECTED_BG_PATTERN);
	assert(lines[0].includes("\x1b[0m{selectedBg}"));
});
