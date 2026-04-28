import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@mariozechner/pi-tui";
import type { AskConfig } from "../src/config/schema.ts";
import { AskSettingsModal } from "../src/ui/settings-modal.ts";

const savedConfig: AskConfig = {
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: false,
		confirmDismissWhenDirty: false,
		showFooterHints: true,
	},
	keymaps: {
		cancel: "esc",
		dismiss: "ctrl+c",
		toggle: "space",
		confirm: "enter",
		optionNote: "n",
		questionNote: "shift+n",
	},
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

function createModal(
	options: {
		onClose?: () => void;
		onSave?: (config: AskConfig) => Promise<AskConfig>;
	} = {}
) {
	const onClose =
		options.onClose ??
		(() => {
			// test callback intentionally unused
		});
	return new AskSettingsModal(plainTheme(), {
		configPath: "/tmp/eko24ive-pi-ask.json",
		notice: undefined,
		onClose,
		onSave: options.onSave ?? ((config) => Promise.resolve(config)),
		savedConfig,
		tui: {
			requestRender() {
				// no-op in tests
			},
		},
	});
}

test("settings modal renders compactly on phone-width screens", () => {
	const modal = createModal();
	const lines = modal.render(28);

	assert(lines.every((line) => visibleWidth(line) <= 28));
	assert(lines.join("\n").includes("@eko24ive/pi-ask"));
	assert(lines[1]?.includes("Keymaps"));
	assert(lines.join("\n").includes("/reload after editing."));
	assert(lines.join("\n").includes("Open ask settings modal"));
	assert.equal(lines[0]?.includes("├"), false);
});

test("settings modal renders behaviour tab with checkbox and dirty notice", () => {
	const modal = createModal();
	modal.handleInput("\t");
	modal.handleInput(" ");
	const lines = modal.render(72);
	const text = lines.join("\n");

	assert(text.includes("Behaviour"));
	assert(text.includes("[x] Auto-submit when answered without notes"));
	assert(text.includes("[ ] Confirm dismiss when dirty"));
	assert(text.includes("[x] Show footer hints"));
	assert(text.includes("Unsaved changes. Press Ctrl+S to save."));
	assert(text.includes("Ctrl+S save · Esc/Ctrl+C/? twice discard"));
});

test("settings modal keymaps tab shows invalid-keymaps session warning", () => {
	const modal = new AskSettingsModal(plainTheme(), {
		configPath: "/tmp/eko24ive-pi-ask.json",
		notice: {
			kind: "error",
			text: "Reserved keymap for cancel: ?. Using default ask keymaps for this session. Edit the config and restart pi or run /reload.",
		},
		onClose() {
			// no-op in test
		},
		onSave: (config) => Promise.resolve(config),
		savedConfig,
		tui: {
			requestRender() {
				// no-op in tests
			},
		},
	});

	const text = modal.render(72).join("\n");
	assert(
		text.includes(
			"Using default keymaps this session because configured keymaps were"
		)
	);
	assert(text.includes("rejected."));
	assert(
		text.includes(
			"Reserved keymap for cancel: ?. Using default ask keymaps for this"
		)
	);
	assert(
		text.includes("session. Edit the config and restart pi or run /reload.")
	);
});

test("settings modal saves and clears dirty state", async () => {
	let saved: AskConfig | undefined;
	const modal = createModal({
		onSave: (config) => {
			saved = config;
			return Promise.resolve(config);
		},
	});

	modal.handleInput("\t");
	modal.handleInput(" ");
	modal.handleInput("\u0013");
	await new Promise((resolve) => setImmediate(resolve));

	const text = modal.render(72).join("\n");
	assert.equal(saved?.behaviour.autoSubmitWhenAnsweredWithoutNotes, true);
	assert.equal(saved?.behaviour.confirmDismissWhenDirty, false);
	assert.equal(saved?.behaviour.showFooterHints, true);
	assert(text.includes("Saved"));
	assert.equal(text.includes("Unsaved changes. Press Ctrl+S to save."), false);
	assert.equal(
		text.includes("[x] Auto-submit when answered without notes"),
		true
	);
});

test("settings modal requires double close when dirty", () => {
	let closed = 0;
	const modal = createModal({
		onClose: () => {
			closed += 1;
		},
	});

	modal.handleInput("\t");
	modal.handleInput(" ");
	modal.handleInput("\u001b");
	assert.equal(closed, 0);
	assert(modal.render(72).join("\n").includes("Press again to discard."));

	modal.handleInput("\u001b");
	assert.equal(closed, 1);
});

test("settings modal ignores enter and closes idempotently on dispose", () => {
	let closed = 0;
	const modal = createModal({
		onClose: () => {
			closed += 1;
		},
	});

	modal.handleInput("\r");
	assert.equal(closed, 0);

	modal.dispose();
	modal.dispose();
	assert.equal(closed, 1);
});
