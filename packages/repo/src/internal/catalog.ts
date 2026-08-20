import { fileURLToPath } from 'node:url';

import type {
  ManagedFileDefinition,
  RepositoryAiProfile,
  RepositoryProfileCatalog,
  ResolvedRepositoryAiProfile,
  ResolvedRepositoryProfile,
} from '../types.js';
import { readJsonFile } from './fs.js';

/**
 * Absolute path to the CLI package's distributed resource root.
 */
export const RESOURCES_DIRECTORY = fileURLToPath(
  new URL('../../resources/', import.meta.url),
);

/**
 * Absolute path to the distributed repository profile catalog.
 */
export const PROFILE_CATALOG_PATH = fileURLToPath(
  new URL('../../resources/profiles/catalog.json', import.meta.url),
);

/**
 * Loads the profile catalog bundled with the CLI package.
 *
 * @returns Parsed profile catalog.
 * @throws {Error} When the bundled catalog has an invalid shape.
 */
export async function loadProfileCatalog(): Promise<RepositoryProfileCatalog> {
  const value = await readJsonFile(PROFILE_CATALOG_PATH);

  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || !('profiles' in value)
    || typeof value.profiles !== 'object'
    || value.profiles === null
    || Array.isArray(value.profiles)
  ) {
    throw new Error('The bundled repository profile catalog is invalid.');
  }

  const profiles: RepositoryProfileCatalog['profiles'] = {};

  for (const [name, rawProfile] of Object.entries(value.profiles)) {
    if (
      typeof rawProfile !== 'object'
      || rawProfile === null
      || Array.isArray(rawProfile)
    ) {
      throw new Error(`Profile "${name}" is invalid.`);
    }

    const extendsProfiles = parseStringArray(
      name,
      'extends',
      rawProfile.extends,
    );
    const files = parseManagedFiles(name, rawProfile.files);
    const ai = parseAiProfile(name, rawProfile.ai);

    profiles[name] = {
      ...(extendsProfiles !== undefined ? { extends: extendsProfiles } : {}),
      ...(files !== undefined ? { files } : {}),
      ...(ai !== undefined ? { ai } : {}),
    };
  }

  return { profiles };
}

/**
 * Resolves profile inheritance into one deterministic repository profile.
 *
 * Managed files are keyed by target path, so declarations from later profiles
 * override earlier declarations targeting the same path. AI resources compose
 * additively and are de-duplicated while preserving first-seen order.
 *
 * @param requestedProfiles - Top-level profiles selected by the project.
 * @param catalog - Catalog containing all available profiles.
 * @returns Fully composed repository profile.
 * @throws {Error} When a profile is unknown or inheritance is cyclic.
 */
export function resolveRepositoryProfile(
  requestedProfiles: readonly string[],
  catalog: RepositoryProfileCatalog,
): ResolvedRepositoryProfile {
  const files = new Map<string, ManagedFileDefinition>();
  const ai: ResolvedRepositoryAiProfile = {
    skills: [],
    agents: [],
    instructions: [],
  };
  const visiting = new Set<string>();

  const visit = (profileName: string): void => {
    const profile = catalog.profiles[profileName];

    if (!profile) {
      throw new Error(`Unknown repository profile "${profileName}".`);
    }

    if (visiting.has(profileName)) {
      throw new Error(
        `Repository profile inheritance cycle detected at "${profileName}".`,
      );
    }

    visiting.add(profileName);

    for (const parent of profile.extends ?? []) {
      visit(parent);
    }

    for (const file of profile.files ?? []) {
      files.delete(file.target);
      files.set(file.target, { ...file });
    }

    appendUnique(ai.skills, profile.ai?.skills ?? []);
    appendUnique(ai.agents, profile.ai?.agents ?? []);
    appendUnique(ai.instructions, profile.ai?.instructions ?? []);

    visiting.delete(profileName);
  };

  for (const profileName of requestedProfiles) {
    visit(profileName);
  }

  return {
    files: [...files.values()],
    ai,
  };
}

/**
 * Resolves only the managed repository files for selected profiles.
 *
 * This compatibility helper delegates to `resolveRepositoryProfile` and is
 * retained for callers that do not need the AI selection.
 *
 * @param requestedProfiles - Top-level profiles selected by the project.
 * @param catalog - Catalog containing all available profiles.
 * @returns Managed repository files.
 */
export function resolveManagedFiles(
  requestedProfiles: readonly string[],
  catalog: RepositoryProfileCatalog,
): ManagedFileDefinition[] {
  return resolveRepositoryProfile(requestedProfiles, catalog).files;
}

function parseManagedFiles(
  profileName: string,
  value: unknown,
): ManagedFileDefinition[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(`Profile "${profileName}".files must be an array.`);
  }

  return value.map((entry, index) => {
    if (!isManagedFileDefinition(entry)) {
      throw new Error(
        `Profile "${profileName}".files[${index}] is invalid.`,
      );
    }

    return {
      source: entry.source,
      target: entry.target,
      ...(entry.render !== undefined ? { render: entry.render } : {}),
    };
  });
}

function parseAiProfile(
  profileName: string,
  value: unknown,
): RepositoryAiProfile | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new Error(`Profile "${profileName}".ai must be an object.`);
  }

  const skills = parseStringArray(profileName, 'ai.skills', readKey(value, 'skills'));
  const agents = parseStringArray(profileName, 'ai.agents', readKey(value, 'agents'));
  const instructions = parseStringArray(
    profileName,
    'ai.instructions',
    readKey(value, 'instructions'),
  );

  return {
    ...(skills !== undefined ? { skills } : {}),
    ...(agents !== undefined ? { agents } : {}),
    ...(instructions !== undefined ? { instructions } : {}),
  };
}

function parseStringArray(
  profileName: string,
  propertyName: string,
  value: unknown,
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value)
    || !value.every((entry): entry is string => typeof entry === 'string')
  ) {
    throw new Error(
      `Profile "${profileName}".${propertyName} must be an array of strings.`,
    );
  }

  return [...value];
}

function isManagedFileDefinition(
  value: unknown,
): value is ManagedFileDefinition {
  return (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && 'source' in value
    && 'target' in value
    && typeof value.source === 'string'
    && typeof value.target === 'string'
    && (
      !('render' in value)
      || value.render === undefined
      || typeof value.render === 'boolean'
    )
  );
}

function readKey(
  value: object,
  key: string,
): unknown {
  return key in value ? (value as Record<string, unknown>)[key] : undefined;
}

function appendUnique(target: string[], values: readonly string[]): void {
  for (const value of values) {
    if (!target.includes(value)) {
      target.push(value);
    }
  }
}
