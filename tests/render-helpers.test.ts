import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import {
	renderEditorBlock,
	renderFooterText,
} from "../src/ui/render-helpers.ts";

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

test("editing footers do not advertise tab navigation", () => {
	assert.equal(
		renderFooterText(DEFAULT_ASK_CONFIG, "input"),
		" Enter submit · Esc close · ? settings"
	);
	assert.equal(
		renderFooterText(DEFAULT_ASK_CONFIG, "note"),
		" Enter save · Esc close · ? settings"
	);
});

test("editing footers use configured key labels", () => {
	const config = {
		...DEFAULT_ASK_CONFIG,
		keymaps: {
			...DEFAULT_ASK_CONFIG.keymaps,
			confirm: "ctrl+k",
			cancel: "q",
		},
	};

	assert.equal(
		renderFooterText(config, "note"),
		" Ctrl+K save · Q close · ? settings"
	);
});

test("navigation footers show arrows and configured option aliases", () => {
	const config = {
		...DEFAULT_ASK_CONFIG,
		keymaps: {
			...DEFAULT_ASK_CONFIG.keymaps,
			previousOption: "ctrl+p",
			nextOption: "ctrl+n",
		},
	};

	assert.equal(
		renderFooterText(config, "default"),
		" ⇆ tab · ↑/↓/Ctrl+P/Ctrl+N select · Enter confirm · N/Shift+N note · Esc dismiss · ? settings"
	);
});
