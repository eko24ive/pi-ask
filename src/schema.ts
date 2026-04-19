import { Type } from "@sinclair/typebox";

export const AskOptionSchema = Type.Object({
	value: Type.String({
		minLength: 1,
		description:
			"Machine-readable value returned for this option in the result",
	}),
	label: Type.String({
		minLength: 1,
		description: "Short visible option label shown in the list",
	}),
	description: Type.Optional(
		Type.String({
			minLength: 1,
			description: "Optional one-line explanation to help the user choose",
		})
	),
	preview: Type.Optional(
		Type.String({
			minLength: 1,
			description:
				"Optional preview content shown in the dedicated preview pane for preview questions",
		})
	),
});

export const AskQuestionSchema = Type.Object({
	id: Type.String({
		minLength: 1,
		description:
			"Stable question identifier used as the key in returned answers",
	}),
	label: Type.Optional(
		Type.String({
			minLength: 1,
			description: "Short tab label, e.g. Goal, Audience, Tone, Scope",
		})
	),
	prompt: Type.String({
		minLength: 1,
		description:
			"Direct question shown to the user; ask about one decision at a time",
	}),
	type: Type.Optional(
		Type.Union(
			[Type.Literal("single"), Type.Literal("multi"), Type.Literal("preview")],
			{
				description:
					"Question type: use `single` by default, `multi` when several answers may apply, and `preview` when each option needs a preview pane",
			}
		)
	),
	required: Type.Optional(
		Type.Boolean({
			description:
				"Advisory only; marks the question as important but never blocks submission",
		})
	),
	options: Type.Array(AskOptionSchema, {
		minItems: 1,
		description: "Answer options; prefer 2-4 clear choices when possible",
	}),
});

export const AskParamsSchema = Type.Object({
	title: Type.Optional(
		Type.String({
			minLength: 1,
			description:
				"Optional short title shown above the clarification flow, e.g. README direction",
		})
	),
	questions: Type.Array(AskQuestionSchema, {
		minItems: 1,
		description: "Questions to ask in the interactive clarification flow",
	}),
});
