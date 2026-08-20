import { join, normalize, resolve, sep } from 'node:path';

import type {
  ManagedFileDefinition,
  RepositoryConfig,
  RepositoryLock,
  SyncResult,
} from '../types.js';
import {
  pathExists,
  readTextFile,
  removeFile,
  sha256,
  writeTextFileAtomic,
} from './fs.js';
import { TEMPLATES_DIRECTORY } from './catalog.js';
import { renderTemplate } from './template.js';

/**
 * Synchronization execution options.
 */
export interface SynchronizeRepositoryOptions {
  /**
   * Absolute consumer repository root.
   */
  repositoryRoot: string;

  /**
   * Validated repository configuration.
   */
  config: RepositoryConfig;

  /**
   * Existing managed-file lock state.
   */
  lock: RepositoryLock;

  /**
   * Fully resolved managed file declarations.
   */
  files: readonly ManagedFileDefinition[];

  /**
   * When `true`, report drift without modifying the filesystem or lock state.
   */
  check: boolean;

  /**
   * When `true`, overwrite locally modified managed files and remove stale
   * managed files even when their current hashes differ from the lock.
   */
  force: boolean;
}

/**
 * Synchronizes managed repository files against their desired templates.
 *
 * A destination is safe to overwrite only when it is absent or its current
 * content still matches the hash recorded by the previous synchronization.
 * Existing unmanaged files are conflicts unless `force` is enabled.
 *
 * Files previously managed by the CLI but no longer declared are removed when
 * they are unchanged. Locally modified stale files become conflicts instead.
 *
 * @param options - Synchronization inputs and behavior flags.
 * @returns Synchronization result and the lock state that should be persisted.
 */
export async function synchronizeRepository(
  options: SynchronizeRepositoryOptions,
): Promise<{ result: SyncResult; lock: RepositoryLock }> {
  const result: SyncResult = {
    changed: [],
    removed: [],
    drifted: [],
    conflicts: [],
  };

  const nextLock: RepositoryLock = {
    schemaVersion: 1,
    files: {},
  };

  const desiredTargets = new Set<string>();

  for (const file of options.files) {
    const target = normalizeRelativePath(file.target);
    desiredTargets.add(target);

    const sourcePath = resolveWithinDirectory(
      TEMPLATES_DIRECTORY,
      file.source,
      'template source',
    );
    const destinationPath = resolveWithinDirectory(
      options.repositoryRoot,
      target,
      'managed file target',
    );

    const template = await readTextFile(sourcePath);
    const desiredContent = renderTemplate(template, options.config.variables);
    const desiredHash = sha256(desiredContent);
    const previous = options.lock.files[target];
    const destinationExists = await pathExists(destinationPath);

    if (!destinationExists) {
      if (options.check) {
        result.drifted.push(target);
      } else {
        await writeTextFileAtomic(destinationPath, desiredContent);
        result.changed.push(target);
      }

      nextLock.files[target] = {
        hash: desiredHash,
        source: file.source,
      };
      continue;
    }

    const currentContent = await readTextFile(destinationPath);
    const currentHash = sha256(currentContent);

    if (currentHash === desiredHash) {
      nextLock.files[target] = {
        hash: desiredHash,
        source: file.source,
      };
      continue;
    }

    const isSafeToOverwrite = previous?.hash === currentHash;

    if (!isSafeToOverwrite && !options.force) {
      result.conflicts.push(target);

      if (previous) {
        nextLock.files[target] = previous;
      }

      continue;
    }

    if (options.check) {
      result.drifted.push(target);
      nextLock.files[target] = previous ?? {
        hash: currentHash,
        source: file.source,
      };
      continue;
    }

    await writeTextFileAtomic(destinationPath, desiredContent);
    result.changed.push(target);
    nextLock.files[target] = {
      hash: desiredHash,
      source: file.source,
    };
  }

  for (const [target, previous] of Object.entries(options.lock.files)) {
    if (desiredTargets.has(target)) {
      continue;
    }

    const destinationPath = resolveWithinDirectory(
      options.repositoryRoot,
      target,
      'stale managed file target',
    );

    if (!await pathExists(destinationPath)) {
      continue;
    }

    const currentContent = await readTextFile(destinationPath);
    const currentHash = sha256(currentContent);
    const isSafeToRemove = currentHash === previous.hash;

    if (!isSafeToRemove && !options.force) {
      result.conflicts.push(target);
      nextLock.files[target] = previous;
      continue;
    }

    if (options.check) {
      result.drifted.push(target);
      nextLock.files[target] = previous;
      continue;
    }

    await removeFile(destinationPath);
    result.removed.push(target);
  }

  return { result, lock: nextLock };
}

/**
 * Normalizes and validates a repository-relative path.
 *
 * @param path - Relative path supplied by the profile catalog.
 * @returns Normalized path using platform separators.
 * @throws {Error} When the path is absolute or escapes its root.
 */
export function normalizeRelativePath(path: string): string {
  const normalized = normalize(path);

  if (
    normalized === '..'
    || normalized.startsWith(`..${sep}`)
    || resolve(normalized) === normalized
  ) {
    throw new Error(`Managed path must stay relative: "${path}".`);
  }

  return normalized;
}

function resolveWithinDirectory(
  root: string,
  relativePath: string,
  description: string,
): string {
  const normalizedRoot = resolve(root);
  const resolvedPath = resolve(normalizedRoot, relativePath);

  if (
    resolvedPath !== normalizedRoot
    && !resolvedPath.startsWith(`${normalizedRoot}${sep}`)
  ) {
    throw new Error(
      `Invalid ${description} "${relativePath}": path escapes its root.`,
    );
  }

  return resolvedPath;
}
