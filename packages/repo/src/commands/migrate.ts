import { join } from 'node:path';

import pc from 'picocolors';

import { CONFIG_FILE_NAME } from '../constants.js';
import { readJsonFile } from '../internal/fs.js';
import { writeRepositoryConfig } from '../internal/config.js';
import { migrateRepositoryConfig } from '../migrations/run.js';

/**
 * Migrates `.repo-tooling.json` to the current configuration schema.
 *
 * @param repositoryRoot - Absolute repository root.
 */
export async function runMigrateCommand(
  repositoryRoot: string,
): Promise<void> {
  const configPath = join(repositoryRoot, CONFIG_FILE_NAME);
  const input = await readJsonFile(configPath);
  const migrated = migrateRepositoryConfig(input);

  await writeRepositoryConfig(repositoryRoot, migrated);

  console.log(
    pc.green(
      `${CONFIG_FILE_NAME} is at schema version ${migrated.schemaVersion}.`,
    ),
  );
}
