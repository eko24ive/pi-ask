import assert from "node:assert/strict";
import test from "node:test";
import { visibleWidth } from "@mariozechner/pi-tui";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import type { AskConfig } from "../src/config/schema.ts";
import { AskSettingsList } from "../src/ui/settings-list.ts";

const savedConfig: AskConfig = {
	answer: {
		...DEFAULT_ASK_CONFIG.answer,
	},
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: false,
		confirmDismissWhenDirty: true,
		doublePressReviewShortcuts: true,
		showFooterHints: true,
	},
	keymaps: DEFAULT_ASK_CONFIG.keymaps,
	notifications: {
		channels: ["bell"],
		enabled: true,
	},
};

function plainTheme() {
	return {
		bg(_color: string, text: string) {
			return text;
		},
		fg(_color: string, text: string) {
			return text;
		},
	};
}

function createList(
	options: {
		onClose?: () => void;
		onSave?: (config: AskConfig) => Promise<AskConfig>;
		savedConfig?: AskConfig;
	} = {}
) {
	const onClose =
		options.onClose ??
		(() => {
			// test callback intentionally unused
		});
	return new AskSettingsList(plainTheme(), {
		configPath: "/tmp/eko24ive-pi-ask.json",
		notice: undefined,
		onClose,
		onSave: options.onSave ?? ((config) => Promise.resolve(config)),
		savedConfig: options.savedConfig ?? savedConfig,
		tui: {
			requestRender() {
				// no-op in tests
			},
		},
	});
}

test("settings list renders behaviour settings and config path", () => {
	const list = createList();
	const text = list.render(72).join("\n");

	assert(text.includes("╭"));
	assert(text.includes("@eko24ive/pi-ask"));
	assert(text.includes("Auto-submit when answered without notes"));
	assert(text.includes("[off]"));
	assert(text.includes("Confirm dismiss when dirty"));
	assert(text.includes("on"));
	assert(text.includes("Edit this config file to customize"));
	assert(text.includes("keymaps"));
	assert(text.includes("notifications"));
	assert(text.includes("extraction settings"));
	assert(text.includes("/tmp/eko24ive-pi-ask.json"));
	assert(text.includes("Esc / Ctrl+C / ? to close"));
	assert.equal(text.includes("Esc to cancel"), false);
	assert.equal(text.includes("Keymaps"), false);
	assert.equal(text.includes("Ctrl+S"), false);
	assert.equal(text.includes("Saved"), false);
});

test("settings list stays within narrow render width", () => {
	const list = createList();
	const lines = list.render(28);

	assert(lines.every((line) => visibleWidth(line) <= 28));
	const text = lines.join("\n");
	assert(text.includes("/tmp/eko24ive-pi-ask"));
	assert(text.includes("n"));
});

test("settings list saves behaviour changes immediately without success feedback", async () => {
	let saved: AskConfig | undefined;
	const list = createList({
		onSave: (config) => {
			saved = config;
			return Promise.resolve(config);
		},
	});

	list.handleInput(" ");
	await new Promise((resolve) => setImmediate(resolve));

	const text = list.render(72).join("\n");
	assert.equal(saved?.behaviour.autoSubmitWhenAnsweredWithoutNotes, true);
	assert.equal(saved?.behaviour.confirmDismissWhenDirty, true);
	assert.equal(saved?.behaviour.doublePressReviewShortcuts, true);
	assert.equal(saved?.behaviour.showFooterHints, true);
	assert.equal(text.includes("Saved"), false);
});

test("settings list shows save failures and reverts the toggle", async () => {
	const list = createList({
		onSave: () => Promise.reject(new Error("disk nope")),
	});

	list.handleInput(" ");
	await new Promise((resolve) => setImmediate(resolve));

	const text = list.render(72).join("\n");
	assert(text.includes("disk nope"));
	assert(text.includes("Auto-submit when answered without notes"));
	assert(text.includes("[off]"));
});

test("settings list uses configured navigation and close keys", async () => {
	let saved: AskConfig | undefined;
	const customConfig: AskConfig = {
		...savedConfig,
		keymaps: {
			...savedConfig.keymaps,
			settingsModal: {
				...savedConfig.keymaps.settingsModal,
				nextOption: ["j"],
				previousOption: ["k"],
				toggle: ["x"],
				close: ["q"],
			},
		},
	};
	const list = createList({
		onSave: (config) => {
			saved = config;
			return Promise.resolve(config);
		},
		savedConfig: customConfig,
	});

	list.handleInput("j");
	list.handleInput("x");
	await new Promise((resolve) => setImmediate(resolve));

	assert.equal(saved?.behaviour.confirmDismissWhenDirty, false);
});

test("settings list resets config to defaults after double press", async () => {
	let saveCount = 0;
	let saved: AskConfig | undefined;
	const customConfig: AskConfig = {
		...savedConfig,
		behaviour: {
			...savedConfig.behaviour,
			autoSubmitWhenAnsweredWithoutNotes: true,
			showFooterHints: false,
		},
		notifications: {
			...savedConfig.notifications,
			enabled: false,
		},
	};
	const list = createList({
		onSave: (config) => {
			saveCount += 1;
			saved = config;
			return Promise.resolve(config);
		},
		savedConfig: customConfig,
	});

	list.handleInput("\x1b[A");
	list.handleInput(" ");
	assert.equal(saveCount, 0);
	assert(list.render(72).join("\n").includes("[confirm reset]"));

	list.handleInput(" ");
	await new Promise((resolve) => setImmediate(resolve));

	assert.equal(saveCount, 1);
	assert.deepEqual(saved, DEFAULT_ASK_CONFIG);
});

test("settings list closes with configured keys and dispose idempotently", () => {
	let closed = 0;
	const list = createList({
		onClose: () => {
			closed += 1;
		},
	});

	list.handleInput("?");
	list.handleInput("\u0003");
	list.dispose();
	assert.equal(closed, 1);
});
