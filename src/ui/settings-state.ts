import { normalizeAskConfig } from "../config/defaults.ts";
import type { AskConfig } from "../config/schema.ts";
import type { AskConfigNotice } from "../config/store.ts";

export interface AskSettingsState {
	activeTab: "keymaps" | "behaviour";
	behaviourFocusIndex: number;
	draftConfig: AskConfig;
	notice?: AskConfigNotice;
	pendingCloseUntil?: number;
	savedConfig: AskConfig;
	saving: boolean;
}

export function createAskSettingsState(
	savedConfig: AskConfig,
	notice?: AskConfigNotice
): AskSettingsState {
	return {
		activeTab: "keymaps",
		behaviourFocusIndex: 0,
		draftConfig: normalizeAskConfig(savedConfig),
		notice,
		savedConfig: normalizeAskConfig(savedConfig),
		saving: false,
	};
}

export function clearTransientNotice(
	state: AskSettingsState
): AskSettingsState {
	if (!state.notice || state.notice.kind === "error") {
		return state;
	}
	return {
		...state,
		notice: undefined,
		pendingCloseUntil: undefined,
	};
}

export function completeSave(
	state: AskSettingsState,
	savedConfig: AskConfig
): AskSettingsState {
	const normalized = normalizeAskConfig(savedConfig);
	return {
		...state,
		draftConfig: normalized,
		notice: { kind: "success", text: "Saved" },
		pendingCloseUntil: undefined,
		savedConfig: normalized,
		saving: false,
	};
}

export function failSave(
	state: AskSettingsState,
	message: string
): AskSettingsState {
	return {
		...state,
		notice: { kind: "error", text: message },
		saving: false,
	};
}

export function isDirty(state: AskSettingsState): boolean {
	return !deepEqual(state.draftConfig, state.savedConfig);
}

export function moveBehaviourFocus(
	state: AskSettingsState,
	delta: 1 | -1,
	rowCount: number
): AskSettingsState {
	if (rowCount <= 0) {
		return state;
	}
	const next = Math.max(
		0,
		Math.min(rowCount - 1, state.behaviourFocusIndex + delta)
	);
	return {
		...state,
		behaviourFocusIndex: next,
	};
}

export function moveSettingsTab(
	state: AskSettingsState,
	delta: 1 | -1
): AskSettingsState {
	if (delta === 1) {
		return {
			...state,
			activeTab: state.activeTab === "keymaps" ? "behaviour" : "keymaps",
		};
	}
	return {
		...state,
		activeTab: state.activeTab === "behaviour" ? "keymaps" : "behaviour",
	};
}

export function requestDiscard(
	state: AskSettingsState,
	now: number,
	windowMs: number
): AskSettingsState {
	return {
		...state,
		notice: {
			kind: "warning",
			text: "Unsaved changes. Press again to discard.",
		},
		pendingCloseUntil: now + windowMs,
	};
}

export function setSaving(state: AskSettingsState): AskSettingsState {
	return {
		...state,
		notice: undefined,
		pendingCloseUntil: undefined,
		saving: true,
	};
}

export function shouldDiscard(state: AskSettingsState, now: number): boolean {
	return !!state.pendingCloseUntil && now <= state.pendingCloseUntil;
}

export function toggleBehaviourSetting(
	state: AskSettingsState,
	key: keyof AskConfig["behaviour"]
): AskSettingsState {
	return {
		...state,
		draftConfig: {
			...state.draftConfig,
			behaviour: {
				...state.draftConfig.behaviour,
				[key]: !state.draftConfig.behaviour[key],
			},
		},
	};
}

function deepEqual(left: AskConfig, right: AskConfig): boolean {
	return (
		left.behaviour.autoSubmitWhenAnsweredWithoutNotes ===
			right.behaviour.autoSubmitWhenAnsweredWithoutNotes &&
		left.behaviour.confirmDismissWhenDirty ===
			right.behaviour.confirmDismissWhenDirty &&
		left.behaviour.showFooterHints === right.behaviour.showFooterHints &&
		left.keymaps.cancel === right.keymaps.cancel &&
		left.keymaps.dismiss === right.keymaps.dismiss &&
		left.keymaps.toggle === right.keymaps.toggle &&
		left.keymaps.confirm === right.keymaps.confirm &&
		left.keymaps.optionNote === right.keymaps.optionNote &&
		left.keymaps.questionNote === right.keymaps.questionNote
	);
}
