import assert from "node:assert/strict";
import test from "node:test";
import { registerAnswerCommands } from "../src/answer-commands.ts";

function registerCommands() {
	const commands = new Map<
		string,
		{ handler: (args: string, ctx: any) => Promise<void> }
	>();
	registerAnswerCommands({
		registerCommand(
			name: string,
			command: { handler: (args: string, ctx: any) => Promise<void> }
		) {
			commands.set(name, command);
		},
	} as never);
	return commands;
}

test("answer commands do not open custom UI outside TUI mode", async () => {
	const commands = registerCommands();
	const notifications: Array<{ message: string; type: string }> = [];
	let customOpened = false;
	const ctx = {
		mode: "rpc",
		ui: {
			custom() {
				customOpened = true;
			},
			notify(message: string, type: string) {
				notifications.push({ message, type });
			},
		},
	};

	await commands.get("answer")?.handler("", ctx);
	await commands.get("answer:again")?.handler("", ctx);
	await commands.get("ask:replay")?.handler("", ctx);

	assert.equal(customOpened, false);
	assert.deepEqual(notifications, [
		{ message: "/answer requires interactive TUI mode.", type: "error" },
		{ message: "Ask replay requires interactive TUI mode.", type: "error" },
		{ message: "Ask replay requires interactive TUI mode.", type: "error" },
	]);
});
