import { DEFAULT_ASK_KEYMAPS } from "../constants/keymaps.ts";
import type { AskConfig, AskConfigFileV1 } from "./schema.ts";

export const DEFAULT_ASK_CONFIG: AskConfig = {
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: false,
		confirmDismissWhenDirty: false,
		showFooterHints: true,
	},
	keymaps: {
		...DEFAULT_ASK_KEYMAPS,
	},
};

export function normalizeAskConfig(
	config?: Partial<AskConfigFileV1> | AskConfig
): AskConfig {
	return {
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes:
				config?.behaviour?.autoSubmitWhenAnsweredWithoutNotes ??
				DEFAULT_ASK_CONFIG.behaviour.autoSubmitWhenAnsweredWithoutNotes,
			confirmDismissWhenDirty:
				config?.behaviour?.confirmDismissWhenDirty ??
				DEFAULT_ASK_CONFIG.behaviour.confirmDismissWhenDirty,
			showFooterHints:
				config?.behaviour?.showFooterHints ??
				DEFAULT_ASK_CONFIG.behaviour.showFooterHints,
		},
		keymaps: {
			...DEFAULT_ASK_CONFIG.keymaps,
			...(config?.keymaps ?? {}),
		},
	};
}

export function toAskConfigFileV1(config: AskConfig): AskConfigFileV1 {
	const normalized = normalizeAskConfig(config);
	return {
		schemaVersion: 1,
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes:
				normalized.behaviour.autoSubmitWhenAnsweredWithoutNotes,
			confirmDismissWhenDirty: normalized.behaviour.confirmDismissWhenDirty,
			showFooterHints: normalized.behaviour.showFooterHints,
		},
		keymaps: {
			cancel: normalized.keymaps.cancel,
			dismiss: normalized.keymaps.dismiss,
			toggle: normalized.keymaps.toggle,
			confirm: normalized.keymaps.confirm,
			optionNote: normalized.keymaps.optionNote,
			questionNote: normalized.keymaps.questionNote,
		},
	};
}
