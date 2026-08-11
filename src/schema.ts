import { Type } from "typebox";

export const AskOptionSchema = Type.Object({
	value: Type.String({
		description:
			"Required machine-readable value returned for this option in the result",
	}),
	label: Type.String({
		description: "Required short visible option label shown in the list",
	}),
	description: Type.Optional(
		Type.String({
			description: "Optional one-line explanation to help the user choose",
		})
	),
	preview: Type.Optional(
		Type.String({
			description:
				"Optional preview content shown in the dedicated preview pane for preview questions",
		})
	),
});

export const AskQuestionSchema = Type.Object({
	id: Type.String({
		description:
			"Required stable question identifier used as the key in returned answers",
	}),
	label: Type.Optional(
		Type.String({
			description: "Short tab label, e.g. Goal, Audience, Tone, Scope",
		})
	),
	prompt: Type.String({
		description:
			"Required direct question shown to the user; ask about one decision at a time",
	}),
	type: Type.Optional(
		Type.String({
			description:
				"Question type: `single` means one answer is expected, `multi` means multiple answers could reasonably be selected, and `preview` means options need preview-pane detail. Use `preview` only when every option includes `preview` text; descriptions alone are not enough.",
		})
	),
	required: Type.Optional(
		Type.Boolean({
			description:
				"Advisory only; marks the question as important but never blocks submission",
		})
	),
	options: Type.Array(AskOptionSchema, {
		description:
			"Answer options; provide clear, distinct choices and do not add filler options",
	}),
});

export const AskParamsSchema = Type.Object({
	title: Type.Optional(
		Type.String({
			description:
				"Optional short title shown above the clarification flow, e.g. README direction",
		})
	),
	questions: Type.Array(AskQuestionSchema, {
		description: "Questions to ask in the interactive clarification flow",
	}),
});

const AnswerExtractionOptionSchema = Type.Object({
	value: Type.String({ description: "Machine-readable option value" }),
	label: Type.String({ description: "Short visible option label" }),
	description: AskOptionSchema.properties.description,
	preview: AskOptionSchema.properties.preview,
	freeform: Type.Optional(
		Type.Boolean({
			description:
				"Use only when the assistant offered no concrete choices and the user should type an answer",
		})
	),
});

const AnswerExtractionQuestionSchema = Type.Object({
	id: Type.String({ description: "Stable snake_case question identifier" }),
	label: AskQuestionSchema.properties.label,
	prompt: Type.String({ description: "Direct question shown to the user" }),
	type: AskQuestionSchema.properties.type,
	required: AskQuestionSchema.properties.required,
	options: Type.Array(AnswerExtractionOptionSchema, {
		description:
			"Choices explicitly offered by the assistant, or one freeform option when the user should type an answer",
		minItems: 1,
	}),
});

export const AnswerExtractionParamsSchema = Type.Object({
	...AskParamsSchema.properties,
	questions: Type.Array(AnswerExtractionQuestionSchema, {
		description: "Questions extracted from the assistant message",
	}),
});
