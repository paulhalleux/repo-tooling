import type { JsonValue } from '../types.js';
import type { RepositoryConfigMigration } from './types.js';

/**
 * Configuration migration registry.
 *
 * Schema version `0` represents an early legacy shape with a singular
 * `profile` field and optional variables:
 *
 * `{ "profile": "typescript-library", "variables": { ... } }`
 */
export const CONFIG_MIGRATIONS: readonly RepositoryConfigMigration[] = [
  {
    from: 0,
    to: 1,
    migrate(config: JsonValue): JsonValue {
      if (
        typeof config !== 'object'
        || config === null
        || Array.isArray(config)
      ) {
        throw new Error('Legacy repository configuration must be an object.');
      }

      const legacyProfile = config.profile;
      const legacyVariables = config.variables;

      return {
        schemaVersion: 1,
        profiles: typeof legacyProfile === 'string'
          ? [legacyProfile]
          : ['typescript-library'],
        variables:
          typeof legacyVariables === 'object'
          && legacyVariables !== null
          && !Array.isArray(legacyVariables)
            ? legacyVariables
            : {},
      };
    },
  },
];
