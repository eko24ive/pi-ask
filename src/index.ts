import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerAskSettingsCommand } from "./ask-settings-command.ts";
import { registerAskTool } from "./ask-tool.ts";

export default function askExtension(pi: ExtensionAPI) {
	registerAskTool(pi);
	registerAskSettingsCommand(pi);
}
