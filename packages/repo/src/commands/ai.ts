import pc from 'picocolors';

import {
  loadProfileCatalog,
  resolveRepositoryProfile,
} from '../internal/catalog.js';
import { readRepositoryConfig } from '../internal/config.js';

/**
 * Lists the project-scoped AI resources selected by the repository profiles.
 *
 * This command is informational only. `repo sync` remains the single command
 * that materializes and updates repository-managed content.
 *
 * @param repositoryRoot - Absolute repository root.
 */
export async function runAiListCommand(
  repositoryRoot: string,
): Promise<void> {
  const config = await readRepositoryConfig(repositoryRoot);
  const catalog = await loadProfileCatalog();
  const { ai } = resolveRepositoryProfile(config.profiles, catalog);

  printSection('Skills', ai.skills);
  printSection('Agents', ai.agents);
  printSection('Instruction fragments', ai.instructions);
}

function printSection(title: string, values: readonly string[]): void {
  console.log(pc.bold(title));

  if (values.length === 0) {
    console.log(pc.dim('  (none)'));
    return;
  }

  for (const value of values) {
    console.log(`  - ${value}`);
  }
}
