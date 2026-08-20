import { CURRENT_CONFIG_SCHEMA_VERSION } from '../constants.js';
import type { JsonValue, RepositoryConfig } from '../types.js';
import { parseRepositoryConfig } from '../internal/config.js';
import { CONFIG_MIGRATIONS } from './registry.js';

/**
 * Migrates raw repository configuration to the current schema.
 *
 * Missing `schemaVersion` is interpreted as version `0` for compatibility
 * with the CLI's initial legacy configuration shape.
 *
 * @param input - Raw JSON configuration.
 * @returns Migrated, validated current configuration.
 * @throws {Error} When a required migration is unavailable or produces an
 * invalid schema transition.
 */
export function migrateRepositoryConfig(
  input: JsonValue,
): RepositoryConfig {
  let current = input;
  let version = readSchemaVersion(current);

  if (version > CURRENT_CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `Configuration schema ${version} is newer than this CLI supports `
      + `(${CURRENT_CONFIG_SCHEMA_VERSION}).`,
    );
  }

  while (version < CURRENT_CONFIG_SCHEMA_VERSION) {
    const migration = CONFIG_MIGRATIONS.find(
      (candidate) => candidate.from === version,
    );

    if (!migration) {
      throw new Error(
        `No repository configuration migration exists from schema ${version}.`,
      );
    }

    current = migration.migrate(current);
    const nextVersion = readSchemaVersion(current);

    if (nextVersion !== migration.to || nextVersion <= version) {
      throw new Error(
        `Migration ${migration.from} -> ${migration.to} produced invalid `
        + `schema version ${nextVersion}.`,
      );
    }

    version = nextVersion;
  }

  return parseRepositoryConfig(current);
}

function readSchemaVersion(config: JsonValue): number {
  if (
    typeof config === 'object'
    && config !== null
    && !Array.isArray(config)
    && typeof config.schemaVersion === 'number'
    && Number.isInteger(config.schemaVersion)
  ) {
    return config.schemaVersion;
  }

  return 0;
}
