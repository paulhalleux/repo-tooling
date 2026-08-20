import { execFile } from 'node:child_process';
import { dirname, join, parse } from 'node:path';
import { promisify } from 'node:util';

import { pathExists, readJsonFile } from './fs.js';

const execFileAsync = promisify(execFile);

/**
 * Finds the root directory of the current repository.
 *
 * The search prefers a `.git` marker and falls back to the nearest
 * `package.json`. Searching stops at the filesystem root.
 *
 * @param startDirectory - Directory from which to start searching.
 * @returns Absolute repository root path.
 * @throws {Error} When no repository root can be identified.
 */
export async function findRepositoryRoot(
  startDirectory: string,
): Promise<string> {
  let current = startDirectory;
  let packageRoot: string | undefined;

  while (true) {
    if (await pathExists(join(current, '.git'))) {
      return current;
    }

    if (!packageRoot && await pathExists(join(current, 'package.json'))) {
      packageRoot = current;
    }

    const parent = dirname(current);
    if (parent === current || current === parse(current).root) {
      break;
    }

    current = parent;
  }

  if (packageRoot) {
    return packageRoot;
  }

  throw new Error(
    `Could not find a repository root from "${startDirectory}".`,
  );
}

/**
 * Reads a package name from the repository's root `package.json` when
 * available.
 *
 * @param repositoryRoot - Absolute repository root.
 * @returns Package name, or `undefined` when no valid string name exists.
 */
export async function readRepositoryPackageName(
  repositoryRoot: string,
): Promise<string | undefined> {
  const packageJsonPath = join(repositoryRoot, 'package.json');

  if (!await pathExists(packageJsonPath)) {
    return undefined;
  }

  const value = await readJsonFile(packageJsonPath);

  if (
    typeof value === 'object'
    && value !== null
    && !Array.isArray(value)
    && typeof value.name === 'string'
  ) {
    return value.name;
  }

  return undefined;
}

/**
 * Attempts to read the GitHub owner and repository name from the `origin`
 * remote.
 *
 * Both SSH (`git@github.com:owner/repo.git`) and HTTPS
 * (`https://github.com/owner/repo.git`) remotes are supported.
 *
 * @param repositoryRoot - Absolute repository root.
 * @returns Parsed owner/repository metadata, or `undefined` when unavailable.
 */
export async function inferGitHubRepository(
  repositoryRoot: string,
): Promise<{ owner: string; name: string } | undefined> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      ['remote', 'get-url', 'origin'],
      { cwd: repositoryRoot },
    );

    const remote = stdout.trim();
    const match = remote.match(
      /github\.com(?::|\/)(?<owner>[^/]+)\/(?<name>[^/]+?)(?:\.git)?$/,
    );

    const owner = match?.groups?.owner;
    const name = match?.groups?.name;

    if (!owner || !name) {
      return undefined;
    }

    return { owner, name };
  } catch {
    return undefined;
  }
}
