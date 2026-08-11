import type {
	ExtensionAPI,
	ExtensionContext,
	SessionStartEvent,
} from "@earendil-works/pi-coding-agent";
import { successfulResponse } from "./ask-tool-helpers.ts";
import {
	appendPendingAskDismissal,
	findPendingAskToolCall,
	type PendingAskToolCall,
} from "./pending-ask.ts";
import type { RemoteAskRuntime } from "./remote-ask.ts";
import { runAskFlow } from "./ui/controller.ts";

const REOPEN_REASONS: ReadonlySet<SessionStartEvent["reason"]> = new Set([
	"startup",
	"resume",
	"fork",
]);
const DISMISS_NOTICE =
	"Unanswered ask_user form dismissed; use /ask:replay to reopen it.";

export function registerPendingAskResume(
	pi: ExtensionAPI,
	remoteAsk: RemoteAskRuntime
): void {
	let reopening = false;

	pi.on("session_start", (event, ctx) => {
		if (reopening || ctx.mode !== "tui" || !REOPEN_REASONS.has(event.reason)) {
			return;
		}

		const pendingAsk = findPendingAskToolCall(ctx);
		if (!pendingAsk) {
			return;
		}

		reopening = true;
		queueMicrotask(() => {
			reopenPendingAsk(pi, ctx, pendingAsk, remoteAsk)
				.catch((error) => {
					ctx.ui.notify(
						`Could not reopen unanswered ask_user form: ${formatError(error)}`,
						"error"
					);
				})
				.finally(() => {
					reopening = false;
				});
		});
	});
}

async function reopenPendingAsk(
	pi: Pick<ExtensionAPI, "appendEntry" | "sendUserMessage">,
	ctx: ExtensionContext,
	pendingAsk: PendingAskToolCall,
	remoteAsk: RemoteAskRuntime
): Promise<void> {
	ctx.ui.notify(
		`Reopening unanswered ask_user form: ${pendingAsk.params.questions.length} question(s).`,
		"info"
	);
	ctx.ui.setWorkingVisible(false);

	let result: Awaited<ReturnType<typeof runAskFlow>>;
	try {
		result = await runAskFlow(ctx, pendingAsk.params, {
			remote: {
				runtime: remoteAsk,
				source: "ask:resume",
				toolCallId: pendingAsk.toolCallId,
			},
		});
	} finally {
		ctx.ui.setWorkingVisible(true);
	}

	appendPendingAskDismissal(pi, pendingAsk.toolCallId);
	if (result.cancelled) {
		ctx.ui.notify(DISMISS_NOTICE, "info");
		return;
	}

	const text = successfulResponse(result).content[0].text;
	pi.sendUserMessage(
		text,
		ctx.isIdle() ? undefined : { deliverAs: "followUp" }
	);
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
