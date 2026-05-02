import type { AskConfigMigration, VersionedAskConfigFile } from "./types.ts";

export const CURRENT_ASK_CONFIG_SCHEMA_VERSION = 2;

const ASK_CONFIG_MIGRATIONS: AskConfigMigration[] = [
	{
		from: 1,
		to: 2,
		migrate: (config) => ({
			...config,
			schemaVersion: 2,
		}),
	},
];

export class AskConfigVersionMigrationError extends Error {
	readonly reason: "invalid_or_unsupported" | "migration_failed";

	constructor(
		message: string,
		reason: "invalid_or_unsupported" | "migration_failed"
	) {
		super(message);
		this.reason = reason;
	}
}

export interface AskConfigVersionMigrationResult {
	config: VersionedAskConfigFile;
	migrated: boolean;
}

export function migrateAskConfigFileToCurrent(
	raw: unknown
): AskConfigVersionMigrationResult {
	const start = getVersionedConfigFile(raw);
	let config = start;
	let migrated = false;

	while (config.schemaVersion < CURRENT_ASK_CONFIG_SCHEMA_VERSION) {
		const migration = ASK_CONFIG_MIGRATIONS.find(
			(candidate) => candidate.from === config.schemaVersion
		);
		if (!migration) {
			throw new AskConfigVersionMigrationError(
				`No ask config migration from schemaVersion ${config.schemaVersion}`,
				"migration_failed"
			);
		}
		config = migration.migrate(config);
		if (config.schemaVersion !== migration.to) {
			throw new AskConfigVersionMigrationError(
				`Ask config migration from schemaVersion ${migration.from} did not produce schemaVersion ${migration.to}`,
				"migration_failed"
			);
		}
		migrated = true;
	}

	if (config.schemaVersion !== CURRENT_ASK_CONFIG_SCHEMA_VERSION) {
		throw new AskConfigVersionMigrationError(
			`Unsupported ask config schemaVersion ${config.schemaVersion}`,
			"invalid_or_unsupported"
		);
	}

	return { config, migrated };
}

function getVersionedConfigFile(raw: unknown): VersionedAskConfigFile {
	if (!(raw && typeof raw === "object")) {
		throw new AskConfigVersionMigrationError(
			"Ask config must be an object",
			"invalid_or_unsupported"
		);
	}
	const schemaVersion = (raw as { schemaVersion?: unknown }).schemaVersion;
	if (!Number.isInteger(schemaVersion) || typeof schemaVersion !== "number") {
		throw new AskConfigVersionMigrationError(
			"Ask config must include an integer schemaVersion",
			"invalid_or_unsupported"
		);
	}
	return raw as VersionedAskConfigFile;
}
