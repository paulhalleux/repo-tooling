import pc from 'picocolors';

import { runSyncCommand } from './sync.js';

/**
 * Validates repository tooling configuration and managed-file state.
 *
 * This command intentionally delegates managed-file validation to
 * synchronization check mode so local and CI validation use the exact same
 * rules as `repo sync`.
 *
 * @param repositoryRoot - Absolute repository root.
 */
export async function runCheckCommand(
  repositoryRoot: string,
): Promise<void> {
  await runSyncCommand(repositoryRoot, {
    check: true,
    force: false,
  });

  console.log(pc.green('Repository tooling checks passed.'));
}
