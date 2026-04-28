import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@mariozechner/pi-tui";
import { ASK_HELP_CLOSE_HINT, ASK_KEYMAPS } from "../src/constants/keymaps.ts";
import { AskSettingsModal } from "../src/ui/settings-modal.ts";

const noop = () => {
	// Test callback intentionally does nothing.
};

function plainTheme() {
	return {
		fg(_color: string, text: string) {
			return text;
		},
		bg(_color: string, text: string) {
			return text;
		},
	};
}

test("settings modal renders compactly on phone-width screens", () => {
	const modal = new AskSettingsModal(plainTheme(), noop);
	const lines = modal.render(28);

	assert(lines.length > ASK_KEYMAPS.length + 4);
	assert(lines.every((line) => visibleWidth(line) <= 28));
	assert(lines.join("\n").includes("@eko24ive/pi-ask"));
	assert(lines.slice(-3, -1).join(" ").includes("Esc, Ctrl+C, or ?"));
	assert(lines[1]?.includes("Keymaps"));
	assert.equal(lines[2], "│                          │");
	assert(lines.includes("│ ?                        │"));
	assert(lines.includes("│   Show this menu         │"));
	assert.equal(lines[0]?.includes("├"), false);
});

test("settings modal keeps context rows on wider screens", () => {
	const modal = new AskSettingsModal(plainTheme(), noop);
	const lines = modal.render(72);

	assert(lines.length > ASK_KEYMAPS.length + 4);
	assert(lines.join("\n").includes("Main flow"));
	assert(lines.at(-2)?.includes(ASK_HELP_CLOSE_HINT));
});

test("settings modal switches tabs and closes from configured shortcuts", () => {
	let closed = 0;
	const modal = new AskSettingsModal(plainTheme(), () => {
		closed += 1;
	});

	modal.handleInput("\t");
	assert(
		modal.render(72).join("\n").includes("Behaviour settings coming soon.")
	);
	assert(modal.render(72).join("\n").includes("Behaviour"));

	modal.handleInput("\u001b[Z");
	assert.equal(
		modal.render(72).join("\n").includes("Behaviour settings coming soon."),
		false
	);

	for (const input of ["?", "\u001b", "\u0003"]) {
		const closable = new AskSettingsModal(plainTheme(), () => {
			closed += 1;
		});
		closable.handleInput(input);
	}

	assert.equal(closed, 3);
});

test("settings modal ignores enter and closes idempotently on dispose", () => {
	let closed = 0;
	const modal = new AskSettingsModal(plainTheme(), () => {
		closed += 1;
	});

	modal.handleInput("\r");
	assert.equal(closed, 0);

	modal.dispose();
	modal.dispose();
	assert.equal(closed, 1);
});
