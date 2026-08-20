import type { JsonValue } from '../types.js';

/**
 * Versioned migration for `.repo-tooling.json`.
 */
export interface RepositoryConfigMigration {
  /**
   * Schema version accepted by this migration.
   */
  from: number;

  /**
   * Schema version produced by this migration.
   */
  to: number;

  /**
   * Migrates raw configuration JSON.
   *
   * Migrations operate on JSON rather than the latest typed configuration so
   * they can intentionally accept historical shapes.
   *
   * @param config - Configuration encoded using the `from` schema.
   * @returns Configuration encoded using the `to` schema.
   */
  migrate(config: JsonValue): JsonValue;
}
