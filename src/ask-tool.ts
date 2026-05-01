import type {
	ExtensionAPI,
	ExtensionContext,
} from "@mariozechner/pi-coding-agent";
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
		execute: executeAskTool,
		renderCall: renderAskToolCall,
		renderResult: renderAskToolResult,
	});
}

interface ExecuteContext extends Pick<ExtensionContext, "cwd" | "hasUI"> {}

async function executeAskTool(
	_toolCallId: string,
	params: AskParams,
	_signal: AbortSignal | undefined,
	_onUpdate: unknown,
	ctx: ExecuteContext
) {
	const validation = validateParams(params);
	if (!validation.ok) {
		return invalidPayloadResponse(params, validation.issues);
	}
	if (!ctx.hasUI) {
		return nonInteractiveResponse(validation.state);
	}
	const result = await runAskFlow(ctx as never, params);
	return successfulResponse(result);
}
