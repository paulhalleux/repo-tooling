import type { JsonValue } from '../types.js';
import type { RepositoryConfigMigration } from './types.js';

/**
 * Configuration migration registry.
 *
 * Schema version `0` represents an early legacy shape with a singular
 * `profile` field and optional variables:
 *
 * `{ "profile": "typescript-library", "variables": { ... } }`
 *
 * Schema version `1` used named profiles; version `2` replaces them with the
 * managed layers those profiles selected, so repository tooling and project
 * scaffolding share one composition model.
 */
const PROFILE_LAYERS: Readonly<Record<string, readonly string[]>> = {
  base: ['repo/github-ci', 'ai/skills', 'ai/agents'],
};

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
  {
    from: 1,
    to: 2,
    migrate(config: JsonValue): JsonValue {
      if (
        typeof config !== 'object'
        || config === null
        || Array.isArray(config)
      ) {
        throw new Error('Repository configuration must be an object.');
      }

      const profiles = Array.isArray(config.profiles)
        ? config.profiles
        : ['base'];
      const layers: string[] = [];

      for (const profile of profiles) {
        const mapped = typeof profile === 'string'
          ? PROFILE_LAYERS[profile]
          : undefined;

        if (!mapped) {
          throw new Error(
            `Profile "${String(profile)}" has no managed-layer equivalent. `
            + 'Re-run "repo init" to subscribe to layers directly.',
          );
        }

        for (const layer of mapped) {
          if (!layers.includes(layer)) {
            layers.push(layer);
          }
        }
      }

      const variables = config.variables;

      return {
        schemaVersion: 2,
        layers,
        answers: {
          shared:
            typeof variables === 'object'
            && variables !== null
            && !Array.isArray(variables)
              ? variables
              : {},
          layers: {},
        },
      };
    },
  },
];
