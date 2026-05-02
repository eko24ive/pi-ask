import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";

const AskAnswerModelPreferenceSchema = Type.Object({
	id: Type.String(),
	provider: Type.String(),
});

export const AskConfigFileV2Schema = Type.Object({
	schemaVersion: Type.Literal(2),
	answer: Type.Optional(
		Type.Object({
			extractionModels: Type.Optional(
				Type.Array(AskAnswerModelPreferenceSchema)
			),
			extractionRetries: Type.Optional(Type.Number()),
			extractionTimeoutMs: Type.Optional(Type.Number()),
		})
	),
	behaviour: Type.Optional(
		Type.Object({
			autoSubmitWhenAnsweredWithoutNotes: Type.Optional(Type.Boolean()),
			confirmDismissWhenDirty: Type.Optional(Type.Boolean()),
			doublePressReviewShortcuts: Type.Optional(Type.Boolean()),
			showFooterHints: Type.Optional(Type.Boolean()),
		})
	),
	keymaps: Type.Optional(
		Type.Object({
			cancel: Type.Optional(Type.String()),
			confirm: Type.Optional(Type.String()),
			dismiss: Type.Optional(Type.String()),
			optionNote: Type.Optional(Type.String()),
			questionNote: Type.Optional(Type.String()),
			toggle: Type.Optional(Type.String()),
		})
	),
});

export type AskConfigFileV2 = Static<typeof AskConfigFileV2Schema>;
export type AskConfigFileV1 = Omit<
	AskConfigFileV2,
	"answer" | "schemaVersion"
> & {
	schemaVersion: 1;
};

export interface AskAnswerModelPreference {
	id: string;
	provider: string;
}

export interface AskConfigKeymaps {
	cancel: string;
	confirm: string;
	dismiss: string;
	optionNote: string;
	questionNote: string;
	toggle: string;
}

export interface AskConfig {
	answer: {
		extractionModels: AskAnswerModelPreference[];
		extractionRetries: number;
		extractionTimeoutMs: number;
	};
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: boolean;
		confirmDismissWhenDirty: boolean;
		doublePressReviewShortcuts: boolean;
		showFooterHints: boolean;
	};
	keymaps: AskConfigKeymaps;
}

export const validateAskConfigFileV2 = Compile(AskConfigFileV2Schema);
