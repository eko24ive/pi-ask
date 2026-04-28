import { type Static, Type } from "typebox";
import { Compile } from "typebox/compile";

export const AskConfigFileV1Schema = Type.Object({
	schemaVersion: Type.Literal(1),
	behaviour: Type.Optional(
		Type.Object({
			autoSubmitWhenAnsweredWithoutNotes: Type.Optional(Type.Boolean()),
			confirmDismissWhenDirty: Type.Optional(Type.Boolean()),
			showFooterHints: Type.Optional(Type.Boolean()),
		})
	),
	keymaps: Type.Optional(
		Type.Object({
			cancel: Type.Optional(Type.String()),
			dismiss: Type.Optional(Type.String()),
			toggle: Type.Optional(Type.String()),
			confirm: Type.Optional(Type.String()),
			optionNote: Type.Optional(Type.String()),
			questionNote: Type.Optional(Type.String()),
		})
	),
});

export type AskConfigFileV1 = Static<typeof AskConfigFileV1Schema>;

export interface AskConfigKeymaps {
	cancel: string;
	confirm: string;
	dismiss: string;
	optionNote: string;
	questionNote: string;
	toggle: string;
}

export interface AskConfig {
	behaviour: {
		autoSubmitWhenAnsweredWithoutNotes: boolean;
		confirmDismissWhenDirty: boolean;
		showFooterHints: boolean;
	};
	keymaps: AskConfigKeymaps;
}

export const validateAskConfigFileV1 = Compile(AskConfigFileV1Schema);
