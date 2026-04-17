import { Type } from "@sinclair/typebox";

export const AskOptionSchema = Type.Object({
	value: Type.String({
		description: "Machine-readable value returned for this option",
	}),
	label: Type.String({ description: "Short option title shown in the list" }),
	description: Type.Optional(
		Type.String({ description: "Optional subtitle/description" }),
	),
	preview: Type.Optional(
		Type.String({
			description: "Optional preview text, used by richer question variants",
		}),
	),
});

export const AskQuestionSchema = Type.Object({
	id: Type.String({ description: "Unique question identifier" }),
	label: Type.Optional(
		Type.String({ description: "Short tab label, e.g. Scope or Runtime" }),
	),
	prompt: Type.String({ description: "Full question prompt" }),
	type: Type.Optional(
		Type.Union(
			[Type.Literal("single"), Type.Literal("multi"), Type.Literal("preview")],
			{ description: "Question type" },
		),
	),
	allowOther: Type.Optional(
		Type.Boolean({ description: "Include a fixed 'Type something.' option" }),
	),
	required: Type.Optional(
		Type.Boolean({
			description: "Optional metadata flag; submit is never blocked",
		}),
	),
	options: Type.Array(AskOptionSchema, {
		description: "Available answer options",
	}),
});

export const AskParamsSchema = Type.Object({
	title: Type.Optional(
		Type.String({ description: "Optional title shown above the interview" }),
	),
	questions: Type.Array(AskQuestionSchema, {
		description: "Questions to ask the user",
	}),
});
