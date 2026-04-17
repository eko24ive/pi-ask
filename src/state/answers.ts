import type {
	AskDisplayOption,
	AskResultAnswer,
	AskSelectedOption,
	AskStateAnswer,
} from "../types.ts";

export function emptyAnswer(): AskStateAnswer {
	return { selected: [] };
}

export function cloneAnswer(answer: AskStateAnswer): AskStateAnswer {
	return {
		selected: answer.selected.map(cloneSelection),
		customText: answer.customText,
		note: answer.note,
		optionNotes: answer.optionNotes ? { ...answer.optionNotes } : undefined,
	};
}

export function cloneResultAnswer(answer: AskResultAnswer): AskResultAnswer {
	return {
		values: [...answer.values],
		labels: [...answer.labels],
		indices: [...answer.indices],
		customText: answer.customText,
		note: answer.note,
		optionNotes: answer.optionNotes ? { ...answer.optionNotes } : undefined,
	};
}

export function toggleSelection(
	answer: AskStateAnswer,
	option: AskDisplayOption,
	index: number,
): AskStateAnswer {
	const next = cloneAnswer(answer);
	delete next.customText;
	const selectedIndex = next.selected.findIndex(
		(selection) => selection.value === option.value,
	);

	if (selectedIndex >= 0) {
		next.selected.splice(selectedIndex, 1);
		return next;
	}

	next.selected.push({
		value: option.value,
		label: option.label,
		index: index + 1,
	});
	return next;
}

export function setSingleSelection(
	answer: AskStateAnswer,
	option: AskDisplayOption,
	index: number,
): AskStateAnswer {
	return {
		...emptyAnswer(),
		note: answer.note,
		optionNotes: answer.optionNotes ? { ...answer.optionNotes } : undefined,
		selected: [
			{
				value: option.value,
				label: option.label,
				index: index + 1,
			},
		],
	};
}

export function saveCustomText(
	answer: AskStateAnswer,
	rawValue: string,
): AskStateAnswer {
	const trimmed = rawValue.trim();
	const next = cloneAnswer(answer);
	next.selected = [];
	if (!trimmed) {
		delete next.customText;
		return next;
	}
	next.customText = rawValue;
	return next;
}

export function saveQuestionNote(
	answer: AskStateAnswer,
	rawValue: string,
): AskStateAnswer {
	const next = cloneAnswer(answer);
	if (rawValue.trim()) {
		next.note = rawValue;
		return next;
	}
	delete next.note;
	return next;
}

export function saveOptionNote(
	answer: AskStateAnswer,
	optionValue: string,
	rawValue: string,
): AskStateAnswer {
	const next = cloneAnswer(answer);
	const optionNotes = { ...(next.optionNotes ?? {}) };
	if (rawValue.trim()) {
		optionNotes[optionValue] = rawValue;
	} else {
		delete optionNotes[optionValue];
	}
	next.optionNotes =
		Object.keys(optionNotes).length > 0 ? optionNotes : undefined;
	return next;
}

export function isAnswerEmpty(answer: AskStateAnswer): boolean {
	return (
		answer.selected.length === 0 &&
		!answer.customText &&
		!answer.note &&
		(!answer.optionNotes || Object.keys(answer.optionNotes).length === 0)
	);
}

export function isAnswerAnswered(answer?: AskStateAnswer): boolean {
	if (!answer) {
		return false;
	}
	return answer.selected.length > 0 || !!answer.customText?.trim();
}

export function isOptionSelected(
	answer: AskStateAnswer | undefined,
	optionValue: string,
): boolean {
	return !!answer?.selected.some(
		(selection) => selection.value === optionValue,
	);
}

export function serializeAnswer(answer: AskStateAnswer): AskResultAnswer {
	const values = answer.customText
		? [answer.customText]
		: answer.selected.map((selection) => selection.value);
	const labels = answer.customText
		? [answer.customText]
		: answer.selected.map((selection) => selection.label);
	const indices = answer.selected.map((selection) => selection.index);
	const selectedNotes = answer.optionNotes
		? Object.fromEntries(
				answer.selected
					.map((selection) => [
						selection.value,
						answer.optionNotes?.[selection.value],
					])
					.filter((entry): entry is [string, string] => !!entry[1]),
			)
		: undefined;

	return {
		values,
		labels,
		indices,
		customText: answer.customText,
		note: answer.note,
		optionNotes:
			selectedNotes && Object.keys(selectedNotes).length > 0
				? selectedNotes
				: undefined,
	};
}

function cloneSelection(selection: AskSelectedOption): AskSelectedOption {
	return { ...selection };
}
