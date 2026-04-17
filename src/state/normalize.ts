import type { AskParams, AskQuestion, AskQuestionInput } from "../types.ts";

export function normalizeQuestions(params: AskParams): AskQuestion[] {
	return params.questions.map((question, index) =>
		normalizeQuestion(question, index),
	);
}

function normalizeQuestion(
	question: AskQuestionInput,
	index: number,
): AskQuestion {
	return {
		...question,
		label: question.label?.trim() || `Q${index + 1}`,
		type: question.type ?? "single",
		required: question.required !== false,
	};
}
