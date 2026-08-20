import pc from 'picocolors';

import { resolveAiManagedFiles } from '../internal/ai.js';
import {
  loadProfileCatalog,
  resolveRepositoryProfile,
} from '../internal/catalog.js';
import {
  readRepositoryConfig,
  readRepositoryLock,
  writeRepositoryLock,
} from '../internal/config.js';
import { synchronizeRepository } from '../internal/sync.js';

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
}

/**
 * Synchronizes repository-managed files and project-scoped AI resources.
 *
 * Repository files, Codex skills, custom agents, and shared instruction
 * fragments all flow through the same lock-based ownership model. Unknown
 * project files are never removed, and locally modified managed files become
 * conflicts unless `force` is explicitly enabled.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param options - Synchronization behavior.
 * @throws {Error} When configuration, profiles, resources, or templates are
 * invalid, or when check mode detects drift/conflicts.
 */
export async function runSyncCommand(
  repositoryRoot: string,
  options: SyncCommandOptions,
): Promise<void> {
  const config = await readRepositoryConfig(repositoryRoot);
  const lock = await readRepositoryLock(repositoryRoot);
  const catalog = await loadProfileCatalog();
  const profile = resolveRepositoryProfile(config.profiles, catalog);
  const aiFiles = await resolveAiManagedFiles(profile.ai);
  const files = [...profile.files, ...aiFiles];

  const { result, lock: nextLock } = await synchronizeRepository({
    repositoryRoot,
    config,
    lock,
    files,
    check: options.check,
    force: options.force,
  });

  printPaths('updated', result.changed, pc.green);
  printPaths('removed', result.removed, pc.yellow);
  printPaths('drift', result.drifted, pc.yellow);
  printPaths('conflict', result.conflicts, pc.red);

  if (!options.check) {
    await writeRepositoryLock(repositoryRoot, nextLock);
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
