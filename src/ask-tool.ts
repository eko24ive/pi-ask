import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text, truncateToWidth } from "@mariozechner/pi-tui";
import { renderResultText } from "./result.ts";
import { AskParamsSchema } from "./schema.ts";
import { createInitialState } from "./state/create.ts";
import { summarizeResult, toAskResult } from "./state/result.ts";
import type { AskParams, AskQuestionInput, AskResult } from "./types.ts";
import { UI_DIMENSIONS } from "./ui/constants.ts";
import { runAskFlow } from "./ui/controller.ts";

export function registerAskTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description:
			"Interactive clarification tool for cases where the next step depends on user preferences, missing requirements, or choosing between multiple valid directions. Ask a short structured interview, collect normalized answers, and continue using those answers explicitly instead of guessing. Supports single-select, multi-select, and preview questions with a dedicated preview pane.",
		promptSnippet:
			"Clarify ambiguous or preference-sensitive decisions with a short interactive interview before proceeding",
		promptGuidelines: [
			"Use this tool before making preference-sensitive decisions about scope, tone, UX, naming, architecture, docs, or implementation direction.",
			"When multiple valid directions exist, ask 1-3 concise questions instead of committing to one path on your own.",
			"Prefer one focused decision per question and use short labels with 2-4 clear options.",
			'Use `type: "single"` by default, `type: "multi"` only when several answers can genuinely apply, and `type: "preview"` when options need a dedicated preview pane.',
		],
		parameters: AskParamsSchema,

		async execute(_toolCallId, params: AskParams, _signal, _onUpdate, ctx) {
			const validation = validateParams(params);
			if (!validation.ok) {
				return {
					content: [{ type: "text", text: `Error: ${validation.error}` }],
					details: errorResultDetails(params, true),
				};
			}

			if (!ctx.hasUI) {
				return {
					content: [
						{
							type: "text",
							text: formatNonInteractiveMessage(validation.state),
						},
					],
					details: {
						...toAskResult(validation.state),
						cancelled: true,
					},
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
								question.label || `Q${index + 1}`
						)
						.join(", ")
				: "";
			let text = theme.fg("toolTitle", theme.bold("ask_user "));
			text += theme.fg("muted", `${params.questions?.length ?? 0} question(s)`);
			if (labels) {
				text += theme.fg(
					"dim",
					` (${truncateToWidth(labels, UI_DIMENSIONS.callLabelTruncateWidth)})`
				);
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

function validateParams(
	params: AskParams
):
	| { ok: true; state: ReturnType<typeof createInitialState> }
	| { ok: false; error: string } {
	try {
		return {
			ok: true,
			state: createInitialState(params),
		};
	} catch (error) {
		return {
			ok: false,
			error:
				error instanceof Error ? error.message : "Invalid ask_user payload",
		};
	}
}

function formatNonInteractiveMessage(
	state: ReturnType<typeof createInitialState>
): string {
	const lines = [
		"Needs user input: ask_user requires interactive UI.",
		"Run same tool call in interactive session, or ask user these questions manually:",
	];

	for (const [index, question] of state.questions.entries()) {
		lines.push(`${index + 1}. ${question.label}: ${question.prompt}`);
		for (const option of question.options) {
			lines.push(`   - ${option.label} [${option.value}]`);
		}
		if (question.type !== "preview") {
			lines.push("   - Type your own [custom]");
		}
	}

	lines.push(
		"details.questions contains normalized pending questions. details.answers stays empty until user responds."
	);
	return lines.join("\n");
}
