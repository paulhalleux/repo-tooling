import { join } from 'node:path';

import pc from 'picocolors';

import {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
} from '../constants.js';
import type { RepositoryConfig } from '../types.js';
import {
  pathExists,
} from '../internal/fs.js';
import {
  inferGitHubRepository,
  readRepositoryPackageName,
} from '../internal/repository.js';
import { loadProfileCatalog } from '../internal/catalog.js';
import { writeRepositoryConfig } from '../internal/config.js';
import { runSyncCommand } from './sync.js';

/**
 * Options accepted by the `repo init` command.
 */
export interface InitCommandOptions {
  /**
   * Ordered profiles to assign to the repository.
   */
  profiles: string[];

  /**
   * Explicit GitHub owner used by managed templates.
   */
  githubOwner?: string;

  /**
   * Explicit repository name used by managed templates.
   */
  repositoryName?: string;

  /**
   * Overwrite an existing `.repo-tooling.json`.
   */
  force: boolean;

  /**
   * Skip synchronization after creating configuration.
   */
  sync: boolean;
}

/**
 * Initializes repository tooling configuration.
 *
 * GitHub owner/repository variables are inferred from `origin` when possible.
 * Repository name falls back to the root package name when no GitHub remote is
 * available.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param options - Initialization options.
 * @throws {Error} When configuration already exists without `force`, the
 * selected profile is unknown, or required template variables cannot be
 * inferred.
 */
export async function runInitCommand(
  repositoryRoot: string,
  options: InitCommandOptions,
): Promise<void> {
  const configPath = join(repositoryRoot, CONFIG_FILE_NAME);

  if (await pathExists(configPath) && !options.force) {
    throw new Error(
      `${CONFIG_FILE_NAME} already exists. Pass --force to replace it.`,
    );
  }

  const catalog = await loadProfileCatalog();

  const unknownProfiles = options.profiles.filter(
    (profile) => !catalog.profiles[profile],
  );

  if (unknownProfiles.length > 0) {
    const available = Object.keys(catalog.profiles).sort().join(', ');
    throw new Error(
      `Unknown profile(s): ${unknownProfiles.join(', ')}. `
      + `Available profiles: ${available}.`,
    );
  }

  const github = await inferGitHubRepository(repositoryRoot);
  const packageName = await readRepositoryPackageName(repositoryRoot);

  const repositoryName =
    options.repositoryName
    ?? github?.name
    ?? packageName?.replace(/^@[^/]+\//, '');

  const githubOwner = options.githubOwner ?? github?.owner;

  if (!githubOwner) {
    throw new Error(
      'Could not infer the GitHub owner. Pass --github-owner <owner>.',
    );
  }

  if (!repositoryName) {
    throw new Error(
      'Could not infer the repository name. Pass --repository-name <name>.',
    );
  }

  const config: RepositoryConfig = {
    schemaVersion: CURRENT_CONFIG_SCHEMA_VERSION,
    profiles: [...options.profiles],
    variables: {
      githubOwner,
      repositoryName,
    },
  };

  await writeRepositoryConfig(repositoryRoot, config);

  console.log(
    `${pc.green('created')} ${CONFIG_FILE_NAME} `
    + `(${options.profiles.join(', ')})`,
  );

  if (options.sync) {
    await runSyncCommand(repositoryRoot, {
      check: false,
      force: options.force,
    });
  }
}
