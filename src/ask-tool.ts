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
import { runAskFlow } from "./ui/controller.ts";

export function registerAskTool(pi: ExtensionAPI) {
	pi.registerTool({
		name: "ask_user",
		label: "Ask User",
		description: ASK_TOOL_DESCRIPTION,
		promptSnippet:
			"Clarify ambiguous or preference-sensitive decisions with a short interactive interview before proceeding",
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

interface ExecuteContext extends ExtensionContext {}

async function executeAskTool(
	pi: Pick<ExtensionAPI, "appendEntry">,
	toolCallId: string,
	params: AskParams,
	_signal: AbortSignal | undefined,
	_onUpdate: unknown,
	ctx: ExecuteContext
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
	const result = await runAskFlow(ctx as never, params);
	return successfulResponse(result);
}
