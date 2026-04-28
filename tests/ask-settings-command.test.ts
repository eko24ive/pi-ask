import assert from "node:assert/strict";
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

test("registers /ask-settings and opens the shared modal overlay", async () => {
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
				const component = callback(undefined, plainTheme(), undefined, done);
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
	assert(customCalls[0]?.lines.join("\n").includes("Keymaps"));
});
