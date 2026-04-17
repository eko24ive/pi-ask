export type AskQuestionType = "single" | "multi" | "preview";

export interface AskOption {
	value: string;
	label: string;
	description?: string;
	preview?: string;
}

export interface AskQuestionInput {
	id: string;
	label?: string;
	prompt: string;
	type?: AskQuestionType;
	required?: boolean;
	options: AskOption[];
}

export interface AskParams {
	title?: string;
	questions: AskQuestionInput[];
}

export interface AskQuestion
	extends Omit<AskQuestionInput, "type" | "required" | "label"> {
	label: string;
	type: AskQuestionType;
	required: boolean;
}

export interface AskSelectedOption {
	value: string;
	label: string;
	index: number;
}

export interface AskStateAnswer {
	selected: AskSelectedOption[];
	customText?: string;
	note?: string;
	optionNotes?: Record<string, string>;
}

export interface AskResultAnswer {
	values: string[];
	labels: string[];
	indices: number[];
	customText?: string;
	note?: string;
	optionNotes?: Record<string, string>;
}

export interface AskResult {
	title?: string;
	cancelled: boolean;
	questions: Array<{
		id: string;
		label: string;
		prompt: string;
		type: AskQuestionType;
	}>;
	answers: Record<string, AskResultAnswer>;
}

export type ViewState =
	| { kind: "navigate" }
	| { kind: "submit" }
	| { kind: "input"; questionId: string }
	| { kind: "note"; questionId: string; optionValue?: string };

export interface AskState {
	title?: string;
	questions: AskQuestion[];
	activeTabIndex: number;
	activeOptionIndex: number;
	activeSubmitActionIndex: number;
	view: ViewState;
	answers: Record<string, AskStateAnswer>;
	completed: boolean;
	cancelled: boolean;
}

export interface AskDisplayOption extends AskOption {
	isCustomOption?: boolean;
}

export type AskAction =
	| { type: "MOVE_TAB"; delta: 1 | -1 }
	| { type: "MOVE_OPTION"; delta: 1 | -1 }
	| { type: "OPEN_INPUT"; questionId: string }
	| { type: "OPEN_QUESTION_NOTE"; questionId: string }
	| { type: "OPEN_OPTION_NOTE"; questionId: string; optionValue: string }
	| { type: "CONFIRM" }
	| { type: "TOGGLE_MULTI" }
	| { type: "NUMBER_SHORTCUT"; digit: number }
	| { type: "SAVE_INPUT"; value: string; submit?: boolean }
	| { type: "SAVE_NOTE"; value: string }
	| { type: "CANCEL" };
