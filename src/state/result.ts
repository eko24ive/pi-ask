import { CANCELLED_SUMMARY, SUBMITTED_SUMMARY } from "../constants.ts";
import { formatResultLines } from "../result-format.ts";
import type { AskResult, AskState } from "../types.ts";
import { isAnswerEmpty, serializeAnswer } from "./answers.ts";

export function toAskResult(state: AskState): AskResult {
	const answers = Object.fromEntries(
		Object.entries(state.answers)
			.map(
				([questionId, answer]) =>
					[questionId, serializeAnswer(answer)] as const,
			)
			.filter(([, answer]) => !isSerializedAnswerEmpty(answer)),
	);

	return {
		title: state.title,
		cancelled: state.cancelled,
		questions: state.questions.map((question) => ({
			id: question.id,
			label: question.label,
			prompt: question.prompt,
			type: question.type,
		})),
		answers,
	};
}

export function summarizeResult(result: AskResult): string {
	if (result.cancelled) {
		return CANCELLED_SUMMARY;
	}

	const lines = formatResultLines(result, { mode: "summary" });
	return lines.join("\n") || SUBMITTED_SUMMARY;
}

export function hasAnswerContent(state: AskState, questionId: string): boolean {
	const answer = state.answers[questionId];
	return !!answer && !isAnswerEmpty(answer);
}

function isSerializedAnswerEmpty(
	answer: AskResult["answers"][string],
): boolean {
	return (
		answer.values.length === 0 &&
		answer.labels.length === 0 &&
		answer.indices.length === 0 &&
		!answer.customText &&
		!answer.note &&
		(!answer.optionNotes || Object.keys(answer.optionNotes).length === 0)
	);
}
