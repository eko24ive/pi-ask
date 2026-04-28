import type { ExtensionContext } from "@mariozechner/pi-coding-agent";
import { AskSettingsModal } from "./settings-modal.ts";

export function showAskSettingsModal(
	ui: Pick<ExtensionContext, "ui">["ui"]
): Promise<void> {
	return ui.custom<void>(
		(_tui, theme, _keybindings, done) =>
			new AskSettingsModal(theme, () => {
				done();
			}),
		{
			overlay: true,
			overlayOptions: {
				anchor: "center",
				margin: 1,
				maxHeight: "90%",
				minWidth: 26,
				width: 72,
			},
		}
	);
}
