import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { DEFAULT_ASK_CONFIG } from "../src/config/defaults.ts";
import { AskConfigStore } from "../src/config/store.ts";

const DEFAULT_KEYMAPS_NOTICE_PATTERN =
	/Using default ask keymaps for this session/;

function expectedConfigFile(
	overrides: { behaviour?: typeof DEFAULT_ASK_CONFIG.behaviour } = {}
) {
	return {
		schemaVersion: 4,
		answer: DEFAULT_ASK_CONFIG.answer,
		behaviour: overrides.behaviour ?? DEFAULT_ASK_CONFIG.behaviour,
		keymaps: DEFAULT_ASK_CONFIG.keymaps,
		notifications: DEFAULT_ASK_CONFIG.notifications,
	};
}

async function makeTempPath(name: string): Promise<string> {
	const root = await import("node:fs/promises").then(({ mkdtemp }) =>
		mkdtemp(join(tmpdir(), name))
	);
	return join(root, "eko24ive-pi-ask.json");
}

test("config store writes defaults when file is missing", async () => {
	const path = await makeTempPath("pi-ask-config-missing-");
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();

	assert.deepEqual(result.config, DEFAULT_ASK_CONFIG);
	assert.deepEqual(
		JSON.parse(await readFile(path, "utf-8")),
		expectedConfigFile()
	);
	await rm(dirname(path), { force: true, recursive: true });
});

test("config store writes full normalized config on save", async () => {
	const path = await makeTempPath("pi-ask-config-save-");
	const store = new AskConfigStore(path);

	await store.save({
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes: true,
			confirmDismissWhenDirty: true,
			doublePressReviewShortcuts: true,
			showFooterHints: false,
		},
		keymaps: DEFAULT_ASK_CONFIG.keymaps,
	});

	const content = await readFile(path, "utf-8");
	assert.deepEqual(
		JSON.parse(content),
		expectedConfigFile({
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
				showFooterHints: false,
			},
		})
	);
	await rm(dirname(path), { force: true, recursive: true });
});

test("config store backs up broken json and loads defaults", async () => {
	const path = await makeTempPath("pi-ask-config-broken-");
	await mkdir(dirname(path), { recursive: true });
	await writeFile(path, "{bad json", "utf-8");
	const store = new AskConfigStore(path);

	const result = await store.ensureLoaded();
	const dirEntries = await import("node:fs/promises").then(({ readdir }) =>
		readdir(dirname(path))
	);

	assert.deepEqual(result.config, DEFAULT_ASK_CONFIG);
	assert.equal(
		result.notice?.text,
		"Config was invalid or unsupported. Backed it up and loaded defaults. Change any behaviour setting or edit the config file to save a fresh config."
	);
	assert(dirEntries.some((entry) => entry.includes(".bak.json")));
	await assert.rejects(readFile(path, "utf-8"));
	await rm(dirname(path), { force: true, recursive: true });
});

test("config store loads current config version without rewriting", async () => {
	const path = await makeTempPath("pi-ask-config-current-");
	await mkdir(dirname(path), { recursive: true });
	await writeFile(
		path,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
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
	assert.equal(result.config.behaviour.doublePressReviewShortcuts, true);
	assert.equal(result.config.behaviour.showFooterHints, false);
	assert.deepEqual(result.config.keymaps, DEFAULT_ASK_CONFIG.keymaps);
	await rm(dirname(path), { force: true, recursive: true });
});

test("config store migrates the legacy root config path into extensions", async () => {
	const root = await import("node:fs/promises").then(({ mkdtemp }) =>
		mkdtemp(join(tmpdir(), "pi-ask-config-legacy-"))
	);
	const path = join(root, "extensions", "eko24ive-pi-ask.json");
	const legacyPath = join(root, "eko24ive-pi-ask.json");
	await writeFile(
		legacyPath,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
				showFooterHints: false,
			},
			keymaps: DEFAULT_ASK_CONFIG.keymaps,
		})
	);
	const store = new AskConfigStore(path, [legacyPath]);

	const result = await store.ensureLoaded();

	assert.equal(
		result.config.behaviour.autoSubmitWhenAnsweredWithoutNotes,
		true
	);
	assert.equal(result.config.behaviour.confirmDismissWhenDirty, true);
	assert.equal(result.config.behaviour.doublePressReviewShortcuts, true);
	assert.equal(result.config.behaviour.showFooterHints, false);
	await assert.rejects(readFile(legacyPath, "utf-8"));
	assert.deepEqual(
		JSON.parse(await readFile(path, "utf-8")),
		expectedConfigFile({
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
				showFooterHints: false,
			},
		})
	);
	await rm(root, { force: true, recursive: true });
});

test("config store leaves legacy root config when extensions config exists", async () => {
	const root = await import("node:fs/promises").then(({ mkdtemp }) =>
		mkdtemp(join(tmpdir(), "pi-ask-config-conflict-"))
	);
	const path = join(root, "extensions", "eko24ive-pi-ask.json");
	const legacyPath = join(root, "eko24ive-pi-ask.json");
	await mkdir(dirname(path), { recursive: true });
	await writeFile(
		path,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: false,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
				showFooterHints: true,
			},
			keymaps: DEFAULT_ASK_CONFIG.keymaps,
		})
	);
	await writeFile(
		legacyPath,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
				showFooterHints: false,
			},
			keymaps: DEFAULT_ASK_CONFIG.keymaps,
		})
	);
	const store = new AskConfigStore(path, [legacyPath]);

	const result = await store.ensureLoaded();

	assert.equal(
		result.config.behaviour.autoSubmitWhenAnsweredWithoutNotes,
		false
	);
	assert.equal(result.config.behaviour.showFooterHints, true);
	assert.ok(await readFile(legacyPath, "utf-8"));
	await rm(root, { force: true, recursive: true });
});

test("config store falls back only keymaps when configured keymaps are invalid", async () => {
	const path = await makeTempPath("pi-ask-config-invalid-keymaps-");
	await mkdir(dirname(path), { recursive: true });
	await writeFile(
		path,
		JSON.stringify({
			schemaVersion: 1,
			behaviour: {
				autoSubmitWhenAnsweredWithoutNotes: true,
				confirmDismissWhenDirty: true,
				doublePressReviewShortcuts: true,
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
	assert.equal(result.config.behaviour.doublePressReviewShortcuts, true);
	assert.equal(result.config.behaviour.showFooterHints, false);
	assert.deepEqual(result.config.keymaps, DEFAULT_ASK_CONFIG.keymaps);
	assert.match(result.notice?.text ?? "", DEFAULT_KEYMAPS_NOTICE_PATTERN);
	await rm(dirname(path), { force: true, recursive: true });
});
