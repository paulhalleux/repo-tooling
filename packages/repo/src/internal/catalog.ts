import { fileURLToPath } from 'node:url';

import type {
  ManagedFileDefinition,
  RepositoryProfileCatalog,
} from '../types.js';
import { readJsonFile } from './fs.js';

/**
 * Absolute path to the package's distributed template catalog.
 */
export const PROFILE_CATALOG_PATH = fileURLToPath(
  new URL('../../templates/profiles.json', import.meta.url),
);

/**
 * Absolute path to the package's distributed templates directory.
 */
export const TEMPLATES_DIRECTORY = fileURLToPath(
  new URL('../../templates/', import.meta.url),
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

    const extendsProfiles = rawProfile.extends;
    const files = rawProfile.files;

    if (
      extendsProfiles !== undefined
      && (
        !Array.isArray(extendsProfiles)
        || !extendsProfiles.every((entry) => typeof entry === 'string')
      )
    ) {
      throw new Error(`Profile "${name}".extends must be a string array.`);
    }

    if (
      files !== undefined
      && (
        !Array.isArray(files)
        || !files.every(isManagedFileDefinition)
      )
    ) {
      throw new Error(`Profile "${name}".files is invalid.`);
    }

    const parsedExtends = parseExtends(name, rawProfile.extends);
    const parsedFiles = parseManagedFiles(name, rawProfile.files);

    profiles[name] = {
      ...(parsedExtends !== undefined
        ? { extends: parsedExtends }
        : {}),
      ...(parsedFiles !== undefined
        ? { files: parsedFiles }
        : {}),
    };
  }

  return { profiles };
}

/**
 * Resolves profile inheritance into a deterministic managed-file set.
 *
 * Later profiles override files targeting the same destination. A profile
 * cycle is rejected explicitly.
 *
 * @param requestedProfiles - Top-level profiles selected by the project.
 * @param catalog - Catalog containing all available profiles.
 * @returns Managed files ordered by their final declaration order.
 * @throws {Error} When a profile is unknown or inheritance is cyclic.
 */
export function resolveManagedFiles(
  requestedProfiles: readonly string[],
  catalog: RepositoryProfileCatalog,
): ManagedFileDefinition[] {
  const resolved = new Map<string, ManagedFileDefinition>();
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
      resolved.delete(file.target);
      resolved.set(file.target, { ...file });
    }

    visiting.delete(profileName);
  };

  for (const profileName of requestedProfiles) {
    visit(profileName);
  }

  return [...resolved.values()];
}

/**
 * Parses the optional inherited profile names of a repository profile.
 *
 * @param profileName - Name of the profile being parsed, used for diagnostics.
 * @param value - Raw profile `extends` value.
 * @returns The inherited profile names, or `undefined` when not declared.
 * @throws {Error} When the value is not an array of strings.
 */
function parseExtends(
  profileName: string,
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
      `Profile "${profileName}".extends must be an array of strings.`,
    );
  }

  return [...value];
}

/**
 * Parses the optional managed-file declarations of a repository profile.
 *
 * @param profileName - Name of the profile being parsed, used for diagnostics.
 * @param value - Raw profile `files` value.
 * @returns Valid managed-file declarations, or `undefined` when not declared.
 * @throws {Error} When the value is not an array of valid managed-file
 * definitions.
 */
function parseManagedFiles(
  profileName: string,
  value: unknown,
): ManagedFileDefinition[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw new Error(
      `Profile "${profileName}".files must be an array.`,
    );
  }

  return value.map((file, index) => {
    if (!isManagedFileDefinition(file)) {
      throw new Error(
        `Profile "${profileName}".files[${index}] is invalid.`,
      );
    }

    return {
      source: file.source,
      target: file.target,
    };
  });
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
  );
}
