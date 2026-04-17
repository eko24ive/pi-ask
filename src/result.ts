import { CANCELLED_RESULT_TEXT, SUBMITTED_RESULT_TEXT } from "./constants.ts";
import { formatResultLines } from "./result-format.ts";
import type { AskResult } from "./types.ts";

export function renderResultText(result: AskResult): string {
	if (result.cancelled) {
		return CANCELLED_RESULT_TEXT;
	}

	const lines = formatResultLines(result, { mode: "render" });
	return lines.join("\n") || SUBMITTED_RESULT_TEXT;
}
