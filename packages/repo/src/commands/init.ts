import { basename, join } from 'node:path';

import {
  isInteractive,
  prepareProject,
  requireScaffold,
} from '@paulhalleux/scaffold';
import pc from 'picocolors';

import {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
} from '../constants.js';
import type { RepositoryConfig } from '../types.js';
import { pathExists } from '../internal/fs.js';
import {
  inferGitHubRepository,
  readRepositoryPackageName,
} from '../internal/repository.js';
import { writeRepositoryConfig } from '../internal/config.js';
import { resolveScaffoldSources } from '../internal/scaffold-sources.js';
import { runSyncCommand } from './sync.js';

/** Scaffold subscribed to when no explicit selection is made. */
export const DEFAULT_TOOLING_SCAFFOLD = 'repo/base';

/**
 * Options accepted by the `repo init` command.
 */
export interface InitCommandOptions {
  /**
   * Scaffold whose managed layers the repository subscribes to.
   */
  scaffold?: string;

  /**
   * Explicit managed layers, replacing the scaffold's layer list.
   */
  layers?: string[];

  /**
   * Answers supplied ahead of time, keyed by question name.
   */
  answers?: Record<string, string>;

  /**
   * Explicit GitHub owner used by managed templates.
   */
  githubOwner?: string;

  /**
   * Explicit repository name used by managed templates.
   */
  repositoryName?: string;

  /**
   * Accept every default instead of asking questions.
   */
  yes?: boolean;

  /**
   * Overwrite an existing `.repo-tooling.json`.
   */
  force: boolean;

  /**
   * Skip synchronization after creating configuration.
   */
  sync: boolean;

  /**
   * Extra catalog sources searched for layers and scaffolds.
   */
  sources?: string[];
}

/**
 * Subscribes a repository to managed tooling layers.
 *
 * Initialization records two things: which managed layers the repository wants
 * kept current, and the answers they render with. `repo sync` replays exactly
 * that, which is what lets shared tooling keep evolving after bootstrap.
 *
 * GitHub owner and repository name are inferred from `origin` when possible,
 * falling back to the root package name, so the common case needs no input.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param options - Initialization options.
 * @throws {Error} When configuration already exists without `force`, or the
 * requested scaffold or layers are unknown.
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

  const { catalog } = await resolveScaffoldSources(
    repositoryRoot,
    options.sources ?? [],
  );
  const entry = requireScaffold(
    catalog,
    options.scaffold ?? DEFAULT_TOOLING_SCAFFOLD,
  );
  // Preparing the project asks the scaffold's questions and then each included
  // layer's own questions, so a layer that offers a choice - which agent skills
  // to install, for instance - gets to ask for it here and have the answer
  // recorded for every later synchronization.
  const project = await prepareProject(entry, catalog, {
    presetAnswers: await inferPresetAnswers(repositoryRoot, options),
    baseVariables: { projectName: basename(repositoryRoot) },
    interactive: isInteractive() && options.yes !== true,
  });

  const layers = options.layers ?? project.layers.map((layer) => layer.id);

  const config: RepositoryConfig = {
    schemaVersion: CURRENT_CONFIG_SCHEMA_VERSION,
    layers,
    answers: project.answers as RepositoryConfig['answers'],
  };

  await writeRepositoryConfig(repositoryRoot, config);

  console.log(
    `${pc.green('created')} ${CONFIG_FILE_NAME} (${layers.join(', ')})`,
  );

  if (options.sync) {
    await runSyncCommand(repositoryRoot, {
      check: false,
      force: options.force,
      ...(options.sources ? { sources: options.sources } : {}),
    });
  }
}

async function inferPresetAnswers(
  repositoryRoot: string,
  options: InitCommandOptions,
): Promise<Record<string, string>> {
  const github = await inferGitHubRepository(repositoryRoot);
  const packageName = await readRepositoryPackageName(repositoryRoot);

  const githubOwner = options.githubOwner ?? github?.owner;
  const repositoryName = options.repositoryName
    ?? github?.name
    ?? packageName?.replace(/^@[^/]+\//, '');

  return {
    ...(githubOwner ? { githubOwner } : {}),
    ...(repositoryName ? { repositoryName } : {}),
    ...options.answers,
  };
}
