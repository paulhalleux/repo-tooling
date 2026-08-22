import pc from 'picocolors';

import { readRepositoryConfig } from '../internal/config.js';
import { planManagedFiles } from '../internal/managed.js';
import { resolveScaffoldSources } from '../internal/scaffold-sources.js';

/**
 * Lists the project-scoped AI resources the repository subscribes to.
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
  const { catalog } = await resolveScaffoldSources(repositoryRoot, []);
  const { files } = await planManagedFiles(catalog, config);

  printSection('Skills', collectNames(files, '.agents/skills/'));
  printSection('Agents', collectNames(files, '.codex/agents/'));
}

function collectNames(
  files: readonly { path: string }[],
  prefix: string,
): string[] {
  const names = new Set<string>();

  for (const file of files) {
    if (!file.path.startsWith(prefix)) {
      continue;
    }

    const rest = file.path.slice(prefix.length);
    const [name] = rest.split('/');

    if (name) {
      names.add(name.replace(/\.toml$/, ''));
    }
  }

  return [...names].sort();
}

function printSection(title: string, values: readonly string[]): void {
  console.log(pc.bold(title));

  if (values.length === 0) {
    console.log(pc.dim('  (none)'));
    return;
  }

  for (const value of values) {
    console.log(`  ${value}`);
  }
}
