import type {
	AskOption,
	AskParams,
	AskQuestion,
	AskQuestionInput,
} from "../types.ts";

export function normalizeQuestions(params: AskParams): AskQuestion[] {
	validateQuestions(params.questions);
	return params.questions.map((question, index) =>
		normalizeQuestion(question, index)
	);
}

function normalizeQuestion(
	question: AskQuestionInput,
	index: number
): AskQuestion {
	return {
		id: question.id.trim(),
		label: question.label?.trim() || `Q${index + 1}`,
		prompt: question.prompt.trim(),
		type: question.type ?? "single",
		required: question.required ?? false,
		options: question.options.map(normalizeOption),
	};
}

function normalizeOption(option: AskOption): AskOption {
	return {
		value: option.value.trim(),
		label: option.label.trim(),
		description: option.description?.trim(),
		preview: option.preview?.trim(),
	};
}

function validateQuestions(questions: AskParams["questions"]): void {
	if (questions.length === 0) {
		throw new Error("At least one question is required");
	}

	const questionIds = new Set<string>();
	for (const [questionIndex, question] of questions.entries()) {
		validateQuestion(question, questionIndex, questionIds);
	}
}

function validateQuestion(
	question: AskQuestionInput,
	questionIndex: number,
	questionIds: Set<string>
): void {
	const questionNumber = questionIndex + 1;
	const questionId = question.id.trim();
	const questionType = question.type ?? "single";

	assertNonEmpty(questionId, `Question ${questionNumber}: id is required`);
	assertUnique(
		questionIds,
		questionId,
		`Question ${questionNumber}: duplicate question id "${questionId}"`
	);
	assertOptionalNonEmpty(
		question.label,
		`Question ${questionNumber}: label must not be empty`
	);
	assertNonEmpty(
		question.prompt.trim(),
		`Question ${questionNumber}: prompt is required`
	);
	assertHasItems(
		question.options,
		`Question ${questionNumber}: at least one option is required`
	);

	const optionValues = new Set<string>();
	for (const [optionIndex, option] of question.options.entries()) {
		validateOption(
			option,
			optionIndex,
			optionValues,
			questionNumber,
			questionType
		);
	}
}

function validateOption(
	option: AskOption,
	optionIndex: number,
	optionValues: Set<string>,
	questionNumber: number,
	questionType: AskQuestion["type"]
): void {
	const optionNumber = optionIndex + 1;
	const prefix = `Question ${questionNumber}, option ${optionNumber}`;
	const optionValue = option.value.trim();

	assertNonEmpty(optionValue, `${prefix}: value is required`);
	assertUnique(
		optionValues,
		optionValue,
		`${prefix}: duplicate option value "${optionValue}"`
	);
	assertNonEmpty(option.label.trim(), `${prefix}: label is required`);
	assertOptionalNonEmpty(
		option.description,
		`${prefix}: description must not be empty`
	);
	assertOptionalNonEmpty(
		option.preview,
		`${prefix}: preview must not be empty`
	);
	if (questionType === "preview") {
		assertNonEmpty(
			option.preview?.trim(),
			`${prefix}: preview questions require preview text for every option`
		);
	}
}

function assertHasItems(items: unknown[], errorMessage: string): void {
	if (items.length === 0) {
		throw new Error(errorMessage);
	}
}

function assertNonEmpty(value: string | undefined, errorMessage: string): void {
	if (!value) {
		throw new Error(errorMessage);
	}
}

function assertOptionalNonEmpty(
	value: string | undefined,
	errorMessage: string
): void {
	if (value !== undefined && !value.trim()) {
		throw new Error(errorMessage);
	}
}

function assertUnique(
	seen: Set<string>,
	value: string,
	errorMessage: string
): void {
	if (seen.has(value)) {
		throw new Error(errorMessage);
	}
	seen.add(value);
}
