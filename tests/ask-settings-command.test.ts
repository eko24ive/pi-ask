import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { registerAskSettingsCommand } from "../src/ask-settings-command.ts";

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

test("registers /ask-settings and opens the shared settings overlay", async () => {
	const agentDir = await mkdtemp(join(tmpdir(), "pi-ask-command-"));
	process.env.PI_CODING_AGENT_DIR = agentDir;

	const commands = new Map<
		string,
		{ handler: (args: string, ctx: any) => Promise<void> }
	>();
	registerAskSettingsCommand({
		registerCommand(
			name: string,
			command: { handler: (args: string, ctx: any) => Promise<void> }
		) {
			commands.set(name, command);
		},
	} as never);

	assert(commands.has("ask-settings"));

	const customCalls: Array<{ options: unknown; lines: string[] }> = [];
	await commands.get("ask-settings")?.handler("", {
		ui: {
			custom(callback: any, options: unknown) {
				const done = () => {
					// test callback intentionally unused
				};
				const tui = {
					requestRender() {
						// test render hook intentionally unused
					},
				};
				const component = callback(tui, plainTheme(), undefined, done);
				customCalls.push({ options, lines: component.render(72) });
				return Promise.resolve();
			},
		},
	});

	assert.equal(customCalls.length, 1);
	assert.deepEqual(customCalls[0]?.options, {
		overlay: true,
		overlayOptions: {
			anchor: "center",
			margin: 1,
			maxHeight: "90%",
			minWidth: 26,
			width: 72,
		},
	});
	const text = customCalls[0]?.lines.join("\n") ?? "";
	assert(text.includes("@eko24ive/pi-ask"));
	assert(text.includes("Edit this config file to customize"));
	assert(text.includes("keymaps"));
	assert(text.includes("notifications"));
	assert(text.includes("extraction settings"));

	delete process.env.PI_CODING_AGENT_DIR;
	await rm(agentDir, { force: true, recursive: true });
});
