import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { getAskConfigPath, getAskConfigStore } from "../config/store.ts";
import { AskSettingsList } from "./settings-list.ts";

export async function showAskSettings(
	ui: Pick<ExtensionContext, "ui">["ui"]
): Promise<void> {
	const store = getAskConfigStore();
	const { config, notice } = await store.ensureLoaded();
	return ui.custom<void>(
		(tui, theme, _keybindings, done) =>
			new AskSettingsList(theme, {
				configPath: getAskConfigPath(),
				notice,
				onClose: () => {
					done();
				},
				onSave: async (nextConfig) => store.save(nextConfig),
				savedConfig: config,
				tui,
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
