import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { AskConfigStore } from "../src/config/store.ts";

const DEFAULT_KEYMAPS_NOTICE_PATTERN =
	/Using default ask keymaps for this session/;

async function makeTempPath(name: string): Promise<string> {
	const root = await import("node:fs/promises").then(({ mkdtemp }) =>
		mkdtemp(join(tmpdir(), name))
	);
	return join(root, "extensions", "eko24ive-pi-ask.json");
}

test("config store uses in-memory defaults when file is missing", async () => {
	const path = await makeTempPath("pi-ask-config-missing-");
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();

	assert.deepEqual(result.config, DEFAULT_ASK_CONFIG);
	await assert.rejects(readFile(path, "utf-8"));
	await rm(join(path, "..", ".."), { force: true, recursive: true });
});

test("config store writes full normalized config on save", async () => {
	const path = await makeTempPath("pi-ask-config-save-");
	const store = new AskConfigStore(path);

	await store.save({
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes: true,
			confirmDismissWhenDirty: true,
			showFooterHints: false,
		},
		keymaps: DEFAULT_ASK_CONFIG.keymaps,
	});

	const content = await readFile(path, "utf-8");
	assert.deepEqual(JSON.parse(content), {
		schemaVersion: 1,
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes: true,
			confirmDismissWhenDirty: true,
			showFooterHints: false,
		},
		keymaps: DEFAULT_ASK_CONFIG.keymaps,
	});
	await rm(join(path, "..", ".."), { force: true, recursive: true });
});

test("config store backs up broken json and loads defaults", async () => {
	const path = await makeTempPath("pi-ask-config-broken-");
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(path, "{bad json", "utf-8");
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();
	const dirEntries = await import("node:fs/promises").then(({ readdir }) =>
		readdir(join(path, ".."))
	);

	assert.deepEqual(result.config, DEFAULT_ASK_CONFIG);
	assert.equal(
		result.notice?.text,
		"Config was invalid or unsupported. Backed it up and loaded defaults. Press Ctrl+S to save a fresh config."
	);
	assert(dirEntries.some((entry) => entry.includes(".bak.json")));
	await assert.rejects(readFile(path, "utf-8"));
	await rm(join(path, "..", ".."), { force: true, recursive: true });
});

test("config store loads current config version without rewriting", async () => {
	const path = await makeTempPath("pi-ask-config-current-");
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(
		path,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				showFooterHints: false,
			},
			keymaps: DEFAULT_ASK_CONFIG.keymaps,
		})
	);
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();

	assert.equal(
		result.config.behaviour.autoSubmitWhenAnsweredWithoutNotes,
		true
	);
	assert.equal(result.config.behaviour.confirmDismissWhenDirty, true);
	assert.equal(result.config.behaviour.showFooterHints, false);
	assert.deepEqual(result.config.keymaps, DEFAULT_ASK_CONFIG.keymaps);
	await rm(join(path, "..", ".."), { force: true, recursive: true });
});

test("config store falls back only keymaps when configured keymaps are invalid", async () => {
	const path = await makeTempPath("pi-ask-config-invalid-keymaps-");
	await mkdir(join(path, ".."), { recursive: true });
	await writeFile(
		path,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				showFooterHints: false,
			},
			keymaps: {
				cancel: "?",
				dismiss: "ctrl+c",
				toggle: "space",
				confirm: "enter",
				optionNote: "n",
				questionNote: "shift+n",
			},
		})
	);
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();

	assert.equal(
		result.config.behaviour.autoSubmitWhenAnsweredWithoutNotes,
		true
	);
	assert.equal(result.config.behaviour.confirmDismissWhenDirty, true);
	assert.equal(result.config.behaviour.showFooterHints, false);
	assert.deepEqual(result.config.keymaps, DEFAULT_ASK_CONFIG.keymaps);
	assert.match(result.notice?.text ?? "", DEFAULT_KEYMAPS_NOTICE_PATTERN);
	await rm(join(path, "..", ".."), { force: true, recursive: true });
});
