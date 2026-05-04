import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
import { appendAskPayload } from "./ask-payload-store.ts";
import {
	ASK_TOOL_DESCRIPTION,
	ASK_TOOL_PROMPT_GUIDELINES,
	invalidPayloadResponse,
	nonInteractiveResponse,
	renderAskToolCall,
	renderAskToolResult,
	successfulResponse,
	validateParams,
} from "./ask-tool-helpers.ts";
import { AskParamsSchema } from "./schema.ts";
import type { AskParams } from "./types.ts";
import { t } from "./i18n.ts";
import { runAskFlow } from "./ui/controller.ts";

export function registerAskTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: t("tool.label", "Ask User"),
		description: t("tool.description", ASK_TOOL_DESCRIPTION),
		promptSnippet: t(
			"tool.promptSnippet",
			"Clarify ambiguous or preference-sensitive decisions with a short interactive interview before proceeding"
		),
		promptGuidelines: [...ASK_TOOL_PROMPT_GUIDELINES],
		parameters: AskParamsSchema,
		execute: (toolCallId, params, signal, onUpdate, ctx) =>
			executeAskTool(
				pi,
				toolCallId,
				params as AskParams,
				signal,
				onUpdate,
				ctx
			),
		renderCall: renderAskToolCall,
		renderResult: renderAskToolResult,
	});
}

async function executeAskTool(
	pi: Pick<ExtensionAPI, "appendEntry">,
	toolCallId: string,
	params: AskParams,
	_signal: AbortSignal | undefined,
	_onUpdate: unknown,
	ctx: ExtensionContext
) {
	const validation = validateParams(params);
	if (!validation.ok) {
		return invalidPayloadResponse(params, validation.issues);
	}
	appendAskPayload(pi, {
		params,
		source: "tool",
		sourceEntryId: toolCallId,
	});
	if (!ctx.hasUI) {
		return nonInteractiveResponse(validation.state);
	}
	ctx.ui.setWorkingVisible(false);
	try {
		const result = await runAskFlow(ctx, params);
		return successfulResponse(result);
	} finally {
		ctx.ui.setWorkingVisible(true);
	}
}
