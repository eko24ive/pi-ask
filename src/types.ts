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
	allowOther?: boolean;
	required?: boolean;
	options: AskOption[];
}

export interface AskParams {
	title?: string;
	questions: AskQuestionInput[];
}

export interface AskQuestion
	extends Omit<AskQuestionInput, "type" | "allowOther" | "required" | "label"> {
	label: string;
	type: AskQuestionType;
	allowOther: boolean;
	required: boolean;
}

export interface AskAnswer {
	values: string[];
	labels: string[];
	indices: number[];
	customText?: string;
	note?: string;
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
	answers: Record<string, AskAnswer>;
}

export type ViewMode = "navigate" | "input" | "submit";

export interface AskState {
	title?: string;
	questions: AskQuestion[];
	currentTab: number;
	optionIndex: number;
	submitIndex: number;
	mode: ViewMode;
	inputQuestionId: string | null;
	answers: Record<string, AskAnswer>;
	completed: boolean;
	cancelled: boolean;
}

export interface RenderOption extends AskOption {
	isOther?: boolean;
}
