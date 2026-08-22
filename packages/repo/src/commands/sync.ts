import pc from 'picocolors';

import { syncPlan } from '@paulhalleux/scaffold';

import {
  readRepositoryConfig,
  readRepositoryLock,
  writeRepositoryLock,
} from '../internal/config.js';
import { planManagedFiles } from '../internal/managed.js';
import { resolveScaffoldSources } from '../internal/scaffold-sources.js';
import { CURRENT_LOCK_SCHEMA_VERSION } from '../constants.js';

/**
 * Options accepted by `repo sync`.
 */
export interface SyncCommandOptions {
  /**
   * Report drift without modifying files.
   */
  check: boolean;

  /**
   * Overwrite or remove conflicting managed files.
   */
  force: boolean;

  /**
   * Extra catalog sources searched for subscribed layers.
   */
  sources?: string[];
}

/**
 * Synchronizes the managed layers a repository subscribes to.
 *
 * The CI workflow, agent skills, and custom agents are all ordinary catalog
 * layers marked `managed`, so they flow through the same lock-based ownership
 * model: unknown project files are never removed, and locally modified managed
 * files become conflicts unless `force` is explicitly enabled.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param options - Synchronization behavior.
 * @throws {Error} When configuration or layers are invalid, or when check mode
 * detects drift or conflicts.
 */
export async function runSyncCommand(
  repositoryRoot: string,
  options: SyncCommandOptions,
): Promise<void> {
  const config = await readRepositoryConfig(repositoryRoot);
  const lock = await readRepositoryLock(repositoryRoot);
  const { catalog } = await resolveScaffoldSources(
    repositoryRoot,
    options.sources ?? [],
  );

  const { files, emptyLayers } = await planManagedFiles(catalog, config);
  const { result, managed } = await syncPlan(files, {
    destination: repositoryRoot,
    previous: lock.files,
    check: options.check,
    force: options.force,
  });

  for (const layer of emptyLayers) {
    console.log(
      `${pc.yellow('empty'.padEnd(8))} ${layer} contributes no files for the `
      + 'recorded answers',
    );
  }

  printPaths('updated', result.changed, pc.green);
  printPaths('removed', result.removed, pc.yellow);
  printPaths('drift', result.drifted, pc.yellow);
  printPaths('conflict', result.conflicts, pc.red);

  if (!options.check) {
    await writeRepositoryLock(repositoryRoot, {
      schemaVersion: CURRENT_LOCK_SCHEMA_VERSION,
      files: managed,
    });
  }

  if (result.conflicts.length > 0) {
    throw new Error(
      'Managed-file conflicts were detected. Review the files or rerun with '
      + '--force if repo-tooling should overwrite local changes.',
    );
  }

  if (options.check && result.drifted.length > 0) {
    throw new Error(
      'Repository tooling is out of sync. Run "repo sync".',
    );
  }

  if (
    result.changed.length === 0
    && result.removed.length === 0
    && result.drifted.length === 0
  ) {
    console.log(pc.green('Repository tooling is up to date.'));
  }
}

function printPaths(
  label: string,
  paths: readonly string[],
  color: (value: string) => string,
): void {
  for (const path of paths) {
    console.log(`${color(label.padEnd(8))} ${path}`);
  }
}
