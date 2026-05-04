import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";

const AskAnswerModelPreferenceSchema = Type.Object({
	id: Type.String(),
	provider: Type.String(),
});

const AskNotificationChannelSchema = Type.Union([
	Type.Literal("bell"),
	Type.Literal("osc9"),
	Type.Literal("osc777"),
	Type.Object({
		command: Type.String(),
		type: Type.Literal("command"),
	}),
]);

export const AskConfigFileV3Schema = Type.Object({
	schemaVersion: Type.Literal(3),
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
	notifications: Type.Optional(
		Type.Object({
			channels: Type.Optional(Type.Array(AskNotificationChannelSchema)),
			enabled: Type.Optional(Type.Boolean()),
		})
	),
});

export const AskConfigFileV2Schema = Type.Omit(AskConfigFileV3Schema, [
	"notifications",
	"schemaVersion",
]);

export type AskConfigFileV3 = Static<typeof AskConfigFileV3Schema>;
export type AskConfigFileV2 = Static<typeof AskConfigFileV2Schema> & {
	schemaVersion: 2;
};
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

export type AskNotificationChannel =
	| "bell"
	| "osc9"
	| "osc777"
	| { command: string; type: "command" };

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
	notifications: {
		channels: AskNotificationChannel[];
		enabled: boolean;
	};
}

export const validateAskConfigFileV3 = Compile(AskConfigFileV3Schema);
