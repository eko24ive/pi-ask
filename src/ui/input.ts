import { Key, matchesKey } from "@mariozechner/pi-tui";
import type { AskState } from "../types.ts";

export type AskInputCommand =
	| { kind: "moveTab"; delta: 1 | -1 }
	| { kind: "moveOption"; delta: 1 | -1 }
	| { kind: "toggleMulti" }
	| { kind: "openQuestionNote" }
	| { kind: "openOptionNote" }
	| { kind: "confirm" }
	| { kind: "cancel" }
	| { kind: "numberShortcut"; digit: number }
	| { kind: "editMoveTab"; delta: 1 | -1 }
	| { kind: "editClose" }
	| { kind: "delegateToEditor" }
	| { kind: "ignore" };

export function getInputCommand(
	state: AskState,
	data: string,
): AskInputCommand {
	if (state.view.kind === "input" || state.view.kind === "note") {
		return getEditingInputCommand(data);
	}

	return getNavigationInputCommand(data);
}

export function formatKeybindingLabel(key: string): string {
	return key
		.split("+")
		.map((part) => {
			if (part.length <= 1) {
				return part.toUpperCase();
			}
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join("+");
}

function getEditingInputCommand(data: string): AskInputCommand {
	if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
		return { kind: "editMoveTab", delta: 1 };
	}
	if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
		return { kind: "editMoveTab", delta: -1 };
	}
	if (matchesKey(data, Key.escape)) {
		return { kind: "editClose" };
	}
	return { kind: "delegateToEditor" };
}

function getNavigationInputCommand(data: string): AskInputCommand {
	if (matchesKey(data, Key.tab) || matchesKey(data, Key.right)) {
		return { kind: "moveTab", delta: 1 };
	}
	if (matchesKey(data, Key.shift("tab")) || matchesKey(data, Key.left)) {
		return { kind: "moveTab", delta: -1 };
	}
	if (matchesKey(data, Key.up)) {
		return { kind: "moveOption", delta: -1 };
	}
	if (matchesKey(data, Key.down)) {
		return { kind: "moveOption", delta: 1 };
	}
	if (matchesKey(data, Key.space)) {
		return { kind: "toggleMulti" };
	}
	if (matchesKey(data, Key.enter)) {
		return { kind: "confirm" };
	}
	if (matchesKey(data, Key.escape)) {
		return { kind: "cancel" };
	}
	if (isQuestionNoteShortcut(data)) {
		return { kind: "openQuestionNote" };
	}
	if (isOptionNoteShortcut(data)) {
		return { kind: "openOptionNote" };
	}

	const digit = parseDigit(data);
	return digit === null
		? { kind: "ignore" }
		: { kind: "numberShortcut", digit };
}

function isOptionNoteShortcut(data: string): boolean {
	return data === "n" || data === "N";
}

function isQuestionNoteShortcut(data: string): boolean {
	return matchesKey(data, Key.ctrl("n"));
}

function parseDigit(data: string): number | null {
	return /^[1-9]$/.test(data) ? Number(data) : null;
}
