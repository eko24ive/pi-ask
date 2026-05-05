import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const JSON_EXTENSION_PATTERN = /\.json$/u;

import { getAgentDir } from "@mariozechner/pi-coding-agent";
import {
	DEFAULT_ASK_CONFIG,
	normalizeAskConfig,
	toAskConfigFileV4,
} from "./defaults.ts";
import { AskConfigMigrationError, migrateAskConfig } from "./migrate.ts";
import { migrateAskConfigPathIfNeeded } from "./path-migrations.ts";
import type { AskConfig } from "./schema.ts";

export interface AskConfigNotice {
	kind: "error" | "warning" | "success";
	text: string;
}

interface AskConfigLoadResult {
	config: AskConfig;
	notice?: AskConfigNotice;
}

export class AskConfigStore {
	private config?: AskConfig;
	private loadPromise?: Promise<AskConfigLoadResult>;
	private notice?: AskConfigNotice;
	private readonly listeners = new Set<(config: AskConfig) => void>();
	private readonly configPath: string;
	private readonly legacyConfigPaths: string[];

	constructor(configPath?: string, legacyConfigPaths?: string[]) {
		this.configPath = configPath ?? getAskConfigPath();
		this.legacyConfigPaths = (
			legacyConfigPaths ?? (configPath ? [] : getLegacyAskConfigPaths())
		).filter((path) => path !== this.configPath);
	}

	subscribe(onChange: (config: AskConfig) => void): () => void {
		this.listeners.add(onChange);
		return () => {
			this.listeners.delete(onChange);
		};
	}

	async ensureLoaded(): Promise<AskConfigLoadResult> {
		if (this.config) {
			return { config: this.config, notice: this.notice };
		}
		if (!this.loadPromise) {
			this.loadPromise = this.loadFromDisk();
		}
		const result = await this.loadPromise;
		this.config = result.config;
		this.notice = result.notice;
		this.loadPromise = undefined;
		return result;
	}

	async getConfig(): Promise<AskConfig> {
		return (await this.ensureLoaded()).config;
	}

	async save(config: AskConfig | Partial<AskConfig>): Promise<AskConfig> {
		const normalized = normalizeAskConfig(config);
		const content = JSON.stringify(
			toAskConfigFileV4(normalized),
			null,
			2
		).concat("\n");
		await mkdir(dirname(this.configPath), { recursive: true });
		await writeFile(this.configPath, content, "utf-8");
		this.setConfig(normalized);
		return normalized;
	}

	setConfig(config: AskConfig): void {
		this.config = normalizeAskConfig(config);
		this.notice = undefined;
		for (const listener of this.listeners) {
			listener(this.config);
		}
	}

	private async loadFromDisk(): Promise<AskConfigLoadResult> {
		await this.migrateLegacyConfigIfNeeded();
		let content: string;
		try {
			content = await readFile(this.configPath, "utf-8");
		} catch (error) {
			if (isMissingFileError(error)) {
				const config = normalizeAskConfig(DEFAULT_ASK_CONFIG);
				await this.save(config);
				return { config };
			}
			throw error;
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(content);
		} catch {
			return this.backupAndReset(
				"Config was invalid or unsupported. Backed it up and loaded defaults. Change any behaviour setting or edit the config file to save a fresh config."
			);
		}

		try {
			const migrated = migrateAskConfig(parsed);
			if (migrated.migrated) {
				await this.save(migrated.config);
			}
			return {
				config: migrated.config,
				notice: migrated.notice
					? {
							kind: "error",
							text: migrated.notice,
						}
					: undefined,
			};
		} catch (error) {
			if (error instanceof AskConfigMigrationError) {
				return this.backupAndReset(
					error.reason === "migration_failed"
						? "Config migration failed. Backed up old config and loaded defaults. Change any behaviour setting or edit the config file to save a fresh config."
						: "Config was invalid or unsupported. Backed it up and loaded defaults. Change any behaviour setting or edit the config file to save a fresh config."
				);
			}
			throw error;
		}
	}

	private async backupAndReset(text: string): Promise<AskConfigLoadResult> {
		const backupPath = createBackupPath(this.configPath, new Date());
		await mkdir(dirname(this.configPath), { recursive: true });
		await rename(this.configPath, backupPath);
		return {
			config: normalizeAskConfig(DEFAULT_ASK_CONFIG),
			notice: {
				kind: "error",
				text,
			},
		};
	}

	private async migrateLegacyConfigIfNeeded(): Promise<void> {
		await migrateAskConfigPathIfNeeded({
			currentPath: this.configPath,
			legacyPaths: this.legacyConfigPaths,
		});
	}
}

let askConfigStore: AskConfigStore | undefined;

export function getAskConfigStore(): AskConfigStore {
	askConfigStore ??= new AskConfigStore();
	return askConfigStore;
}

export function getAskConfigPath(): string {
	return join(getAgentDir(), "extensions", "eko24ive-pi-ask.json");
}

export function getLegacyAskConfigPaths(): string[] {
	return [join(getAgentDir(), "eko24ive-pi-ask.json")];
}

function createBackupPath(path: string, date: Date): string {
	const timestamp = date.toISOString().replaceAll(":", "-").replace(/\./g, "-");
	return path.replace(JSON_EXTENSION_PATTERN, `.${timestamp}.bak.json`);
}

function isMissingFileError(error: unknown): boolean {
	return (
		!!error &&
		typeof error === "object" &&
		"code" in error &&
		error.code === "ENOENT"
	);
}
