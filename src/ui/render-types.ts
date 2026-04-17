import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import type { Editor } from "@mariozechner/pi-tui";
import type {
	getAnswer,
	getCurrentQuestion,
	getRenderableOptions,
} from "../state.ts";
import type { AskDisplayOption, AskState } from "../types.ts";

export type Theme = ExtensionContext["ui"]["theme"];

export interface QuestionRenderContext {
	lines: string[];
	state: AskState;
	question: NonNullable<ReturnType<typeof getCurrentQuestion>>;
	options: ReturnType<typeof getRenderableOptions>;
	theme: Theme;
	width: number;
	editor: Editor;
	newLineHint: string;
}

export interface OptionDetailRenderContext {
	lines: string[];
	state: AskState;
	questionId: string;
	answer: ReturnType<typeof getAnswer>;
	option: AskDisplayOption | undefined;
	theme: Theme;
	width: number;
	editor: Editor;
	newLineHint: string;
	selected?: boolean;
	withGap?: boolean;
}
