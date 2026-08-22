import { join } from 'node:path';

import {
  resolveCatalog,
  type ResolvedCatalog,
  resolveScaffoldSource,
  type ScaffoldSource,
} from '@paulhalleux/scaffold';

import { pathExists } from './fs.js';
import { RESOURCES_DIRECTORY } from './resources.js';

/**
 * Directory holding the catalog bundled with the CLI.
 *
 * Layers, project scaffolds, and AI resources all live below this root and are
 * described by a single `catalog.json`.
 */
export const BUNDLED_SCAFFOLDS_DIRECTORY = RESOURCES_DIRECTORY;

/** Repository-local directory searched for project-owned scaffolds. */
export const REPOSITORY_SCAFFOLDS_DIRECTORY = '.repo-tooling/scaffolds';

/**
 * Resolves the ordered scaffold sources for a command invocation.
 *
 * Bundled scaffolds come first, then a repository-local `.repo-tooling/
 * scaffolds` directory if present, then any explicitly requested sources. Later
 * sources win, so a repository can shadow a bundled scaffold by reusing its ID.
 *
 * @param currentDirectory - Directory relative sources are resolved against.
 * @param specifications - Extra sources: local paths or `giget` specifications.
 * @returns Merged catalog and the sources it was built from.
 */
export async function resolveScaffoldSources(
  currentDirectory: string,
  specifications: readonly string[],
): Promise<{ catalog: ResolvedCatalog; sources: ScaffoldSource[] }> {
  const sources: ScaffoldSource[] = [{
    root: BUNDLED_SCAFFOLDS_DIRECTORY,
    origin: 'bundled',
    trusted: true,
  }];

  const repositoryScaffolds = join(
    currentDirectory,
    REPOSITORY_SCAFFOLDS_DIRECTORY,
  );

  if (await pathExists(join(repositoryScaffolds, 'catalog.json'))) {
    sources.push({
      root: repositoryScaffolds,
      origin: REPOSITORY_SCAFFOLDS_DIRECTORY,
      trusted: true,
    });
  }

  for (const specification of specifications) {
    sources.push(
      await resolveScaffoldSource(specification, currentDirectory),
    );
  }

  return { catalog: await resolveCatalog(sources), sources };
}
