import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text, truncateToWidth } from "@mariozechner/pi-tui";
import { runAskFlow } from "./ask-component.ts";
import { renderResultText } from "./result.ts";
import { AskParamsSchema } from "./schema.ts";
import { createInitialState, summarizeResult, toAskResult } from "./state.ts";
import type { AskParams, AskQuestionInput, AskResult } from "./types.ts";

export function registerAskTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Ask the user one or more structured questions when clarification is required. Supports single-select, multi-select, and preview questions. Use `preview` when an option needs a dedicated preview pane (for example, code, layout, or configuration previews). Return the selected answers as structured data instead of guessing.",
		promptSnippet:
			"Ask the user structured clarification questions and return the answers as structured data",
		promptGuidelines: [
			"Use this tool when requirements are ambiguous or when user preferences materially affect implementation.",
			"Ask 1-3 concise questions instead of guessing.",
			"Prefer short labels and 2-4 clear options per question.",
		],
		parameters: AskParamsSchema,

		async execute(_toolCallId, params: AskParams, _signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				const details = errorResultDetails(params, true);
				return {
					content: [
						{
							type: "text",
							text: "Error: UI not available (running in non-interactive mode)",
						},
					],
					details,
				};
			}

			if (!params.questions?.length) {
				const details = errorResultDetails(params, true);
				return {
					content: [{ type: "text", text: "Error: No questions provided" }],
					details,
				};
			}

			const result = await runAskFlow(ctx, params);
			return {
				content: [{ type: "text", text: summarizeResult(result) }],
				details: result,
			};
		},

		renderCall(args, theme) {
			const params = args as AskParams;
			const labels = Array.isArray(params.questions)
				? params.questions
						.map(
							(question: AskQuestionInput, index) =>
								question.label || `Q${index + 1}`,
						)
						.join(", ")
				: "";
			let text = theme.fg("toolTitle", theme.bold("ask_user "));
			text += theme.fg("muted", `${params.questions?.length ?? 0} question(s)`);
			if (labels) {
				text += theme.fg("dim", ` (${truncateToWidth(labels, 50)})`);
			}
			return new Text(text, 0, 0);
		},

		renderResult(result, _options, theme) {
			const details = result.details as AskResult | undefined;
			if (!details) {
				const text = result.content[0];
				return new Text(text?.type === "text" ? text.text : "", 0, 0);
			}

			if (details.cancelled) {
				return new Text(theme.fg("warning", "Cancelled"), 0, 0);
			}

			return new Text(renderResultText(details), 0, 0);
		},
	});
}

function errorResultDetails(params: AskParams, cancelled: boolean): AskResult {
	try {
		const state = createInitialState(params);
		return {
			...toAskResult(state),
			cancelled,
		};
	} catch {
		return {
			title: params.title,
			cancelled,
			questions: [],
			answers: {},
		};
	}
}
