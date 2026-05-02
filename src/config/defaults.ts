import { DEFAULT_ASK_KEYMAPS } from "../constants/keymaps.ts";
import type { AskConfig, AskConfigFileV2 } from "./schema.ts";

const DEFAULT_EXTRACTION_RETRIES = 1;
const MAX_EXTRACTION_RETRIES = 3;
const DEFAULT_EXTRACTION_TIMEOUT_MS = 30_000;

export const DEFAULT_ASK_CONFIG: AskConfig = {
	answer: {
		extractionModels: [
			{ provider: "openai-codex", id: "gpt-5.4-mini" },
			{ provider: "github-copilot", id: "gpt-5.4-mini" },
			{ provider: "anthropic", id: "claude-haiku-4-5" },
		],
		extractionRetries: DEFAULT_EXTRACTION_RETRIES,
		extractionTimeoutMs: DEFAULT_EXTRACTION_TIMEOUT_MS,
	},
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: false,
		confirmDismissWhenDirty: true,
		doublePressReviewShortcuts: true,
		showFooterHints: true,
	},
	keymaps: {
		...DEFAULT_ASK_KEYMAPS,
	},
};

export function normalizeAskConfig(
	config?: Partial<AskConfigFileV2> | AskConfig
): AskConfig {
	return {
		answer: {
			extractionModels:
				config?.answer?.extractionModels?.filter(isValidModelPreference) ??
				DEFAULT_ASK_CONFIG.answer.extractionModels,
			extractionRetries: clampInteger(
				config?.answer?.extractionRetries,
				0,
				MAX_EXTRACTION_RETRIES,
				DEFAULT_EXTRACTION_RETRIES
			),
			extractionTimeoutMs: positiveNumberOrDefault(
				config?.answer?.extractionTimeoutMs,
				DEFAULT_EXTRACTION_TIMEOUT_MS
			),
		},
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes:
				config?.behaviour?.autoSubmitWhenAnsweredWithoutNotes ??
				DEFAULT_ASK_CONFIG.behaviour.autoSubmitWhenAnsweredWithoutNotes,
			confirmDismissWhenDirty:
				config?.behaviour?.confirmDismissWhenDirty ??
				DEFAULT_ASK_CONFIG.behaviour.confirmDismissWhenDirty,
			doublePressReviewShortcuts:
				config?.behaviour?.doublePressReviewShortcuts ??
				DEFAULT_ASK_CONFIG.behaviour.doublePressReviewShortcuts,
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

export function toAskConfigFileV2(config: AskConfig): AskConfigFileV2 {
	const normalized = normalizeAskConfig(config);
	return {
		schemaVersion: 2,
		answer: {
			extractionModels: normalized.answer.extractionModels,
			extractionRetries: normalized.answer.extractionRetries,
			extractionTimeoutMs: normalized.answer.extractionTimeoutMs,
		},
		behaviour: {
			autoSubmitWhenAnsweredWithoutNotes:
				normalized.behaviour.autoSubmitWhenAnsweredWithoutNotes,
			confirmDismissWhenDirty: normalized.behaviour.confirmDismissWhenDirty,
			doublePressReviewShortcuts:
				normalized.behaviour.doublePressReviewShortcuts,
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

function isValidModelPreference(value: unknown): value is {
	id: string;
	provider: string;
} {
	return (
		!!value &&
		typeof value === "object" &&
		typeof (value as { id?: unknown }).id === "string" &&
		(value as { id: string }).id.trim().length > 0 &&
		typeof (value as { provider?: unknown }).provider === "string" &&
		(value as { provider: string }).provider.trim().length > 0
	);
}

function clampInteger(
	value: unknown,
	min: number,
	max: number,
	fallback: number
): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		return fallback;
	}
	return Math.max(min, Math.min(max, Math.trunc(value)));
}

function positiveNumberOrDefault(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) && value > 0
		? value
		: fallback;
}
