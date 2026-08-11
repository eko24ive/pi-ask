import type { ToolCall } from "@earendil-works/pi-ai";
import type {
	ExtensionAPI,
	ExtensionContext,
	SessionEntry,
} from "@earendil-works/pi-coding-agent";
import { Value } from "typebox/value";
import { findPayloadForSourceEntry } from "./ask-payload-store.ts";
import { validateParams } from "./ask-tool-helpers.ts";
import { AskParamsSchema } from "./schema.ts";
import type { AskParams } from "./types.ts";

export const ASK_PENDING_DISMISSED_ENTRY_TYPE = "ask:pending-dismissed";
const ASK_TOOL_NAME = "ask_user";

export interface PendingAskToolCall {
	params: AskParams;
	toolCallId: string;
}

export function appendPendingAskDismissal(
	pi: Pick<ExtensionAPI, "appendEntry">,
	toolCallId: string
): void {
	pi.appendEntry(ASK_PENDING_DISMISSED_ENTRY_TYPE, { toolCallId });
}

export function findPendingAskToolCall(
	ctx: Pick<ExtensionContext, "sessionManager">
): PendingAskToolCall | undefined {
	const branch = ctx.sessionManager.getBranch();
	const resolvedToolCallIds = collectResolvedToolCallIds(branch);

	for (let entryIndex = branch.length - 1; entryIndex >= 0; entryIndex--) {
		const toolCall = findUnresolvedAskToolCall(
			branch[entryIndex],
			resolvedToolCallIds
		);
		if (!toolCall) {
			continue;
		}

		const params = resolvePendingAskParams(ctx, toolCall);
		if (params) {
			return { params, toolCallId: toolCall.id };
		}
	}
	return;
}

function collectResolvedToolCallIds(
	branch: readonly SessionEntry[]
): Set<string> {
	const resolved = new Set<string>();
	for (const entry of branch) {
		const dismissedToolCallId = getDismissedToolCallId(entry);
		if (dismissedToolCallId) {
			resolved.add(dismissedToolCallId);
			continue;
		}
		if (entry.type === "message" && entry.message.role === "toolResult") {
			resolved.add(entry.message.toolCallId);
		}
	}
	return resolved;
}

function findUnresolvedAskToolCall(
	entry: SessionEntry,
	resolvedToolCallIds: ReadonlySet<string>
): ToolCall | undefined {
	if (
		entry.type !== "message" ||
		entry.message.role !== "assistant" ||
		entry.message.stopReason !== "toolUse"
	) {
		return;
	}

	for (
		let partIndex = entry.message.content.length - 1;
		partIndex >= 0;
		partIndex--
	) {
		const part = entry.message.content[partIndex];
		if (
			part.type === "toolCall" &&
			part.name === ASK_TOOL_NAME &&
			!resolvedToolCallIds.has(part.id)
		) {
			return part;
		}
	}
	return;
}

function resolvePendingAskParams(
	ctx: Pick<ExtensionContext, "sessionManager">,
	toolCall: ToolCall
): AskParams | undefined {
	const persistedPayload = findPayloadForSourceEntry(ctx, toolCall.id, "tool");
	if (persistedPayload) {
		return persistedPayload.params;
	}

	const argumentsFallback = toolCall.arguments;
	if (
		Value.Check(AskParamsSchema, argumentsFallback) &&
		validateParams(argumentsFallback).ok
	) {
		return argumentsFallback;
	}
	return;
}

function getDismissedToolCallId(entry: SessionEntry): string | undefined {
	if (
		entry.type !== "custom" ||
		entry.customType !== ASK_PENDING_DISMISSED_ENTRY_TYPE ||
		!entry.data ||
		typeof entry.data !== "object"
	) {
		return;
	}

	const toolCallId = (entry.data as { toolCallId?: unknown }).toolCallId;
	return typeof toolCallId === "string" ? toolCallId : undefined;
}
