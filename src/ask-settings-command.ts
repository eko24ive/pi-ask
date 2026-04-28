import type {
	ExtensionAPI,
	ExtensionCommandContext,
} from "@mariozechner/pi-coding-agent";
import { showAskSettingsModal } from "./ui/show-settings-modal.ts";

export function registerAskSettingsCommand(pi: ExtensionAPI) {
	pi.registerCommand("ask-settings", {
		description: "Open the ask settings modal",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			await showAskSettingsModal(ctx.ui);
		},
	});
}
