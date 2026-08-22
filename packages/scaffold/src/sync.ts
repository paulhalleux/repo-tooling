import { createHash } from 'node:crypto';
import { readdir, rm, rmdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';

import { pathExists, readBinaryFile, writeFileAtomic } from './fs.js';
import type { PlannedFile } from './plan.js';

/** State recorded for one tool-owned file. */
export interface ManagedFileState {
  /** SHA-256 of the exact content last written by the tool. */
  hash: string;
  /** Layer that produced the file, for diagnostics. */
  layer: string;
}

/** Options controlling a synchronization run. */
export interface SyncPlanOptions {
  /** Absolute project directory. */
  destination: string;
  /** Managed-file state recorded by the previous run. */
  previous: Readonly<Record<string, ManagedFileState>>;
  /** Report drift without touching the filesystem. */
  check?: boolean;
  /** Overwrite locally modified files and remove stale ones anyway. */
  force?: boolean;
}

/** Outcome of a synchronization run. */
export interface SyncResult {
  /** Files created or updated. */
  changed: string[];
  /** Previously managed files removed because they are no longer declared. */
  removed: string[];
  /** Files that differ from the desired state in check mode. */
  drifted: string[];
  /** Files that could not be changed safely because they were edited locally. */
  conflicts: string[];
}

/**
 * Synchronizes managed files against the layers that declare them.
 *
 * A destination is safe to write only when it is absent or its current content
 * still matches the hash recorded by the previous run. A file edited by hand is
 * reported as a conflict instead of being overwritten, and a file that is no
 * longer declared is removed only when it is still untouched. That is what lets
 * shared tooling keep evolving without ever discarding local work.
 *
 * @param files - Planned files; only managed files are considered.
 * @param options - Destination, previous state, and safety switches.
 * @returns What changed and the managed state to persist.
 */
export async function syncPlan(
  files: readonly PlannedFile[],
  options: SyncPlanOptions,
): Promise<{ result: SyncResult; managed: Record<string, ManagedFileState> }> {
  const destination = resolve(options.destination);
  const result: SyncResult = {
    changed: [],
    removed: [],
    drifted: [],
    conflicts: [],
  };
  const managed: Record<string, ManagedFileState> = {};
  const declared = new Set<string>();

  for (const file of files) {
    if (!file.managed) {
      continue;
    }

    declared.add(file.path);
    const path = join(destination, file.path);
    const desiredHash = sha256(file.content);
    const state: ManagedFileState = {
      hash: desiredHash,
      layer: file.contributors[file.contributors.length - 1] ?? '',
    };

    if (!await pathExists(path)) {
      if (options.check) {
        result.drifted.push(file.path);
      } else {
        await writeFileAtomic(path, file.content);
        result.changed.push(file.path);
      }

      managed[file.path] = state;
      continue;
    }

    const currentHash = sha256(await readBinaryFile(path));

    if (currentHash === desiredHash) {
      managed[file.path] = state;
      continue;
    }

    const previous = options.previous[file.path];
    const safeToOverwrite = options.force || previous?.hash === currentHash;

    if (!safeToOverwrite) {
      result.conflicts.push(file.path);
      managed[file.path] = previous ?? state;
      continue;
    }

    if (options.check) {
      result.drifted.push(file.path);
      managed[file.path] = state;
      continue;
    }

    await writeFileAtomic(path, file.content);
    result.changed.push(file.path);
    managed[file.path] = state;
  }

  for (const [path, state] of Object.entries(options.previous)) {
    if (declared.has(path)) {
      continue;
    }

    const absolutePath = join(destination, path);

    if (!await pathExists(absolutePath)) {
      continue;
    }

    const currentHash = sha256(await readBinaryFile(absolutePath));

    if (!options.force && currentHash !== state.hash) {
      result.conflicts.push(path);
      managed[path] = state;
      continue;
    }

    if (options.check) {
      result.drifted.push(path);
      managed[path] = state;
      continue;
    }

    await rm(absolutePath, { force: true });
    await pruneEmptyDirectories(dirname(absolutePath), destination);
    result.removed.push(path);
  }

  return { result, managed };
}

/**
 * Removes directories left empty after a managed file is deleted.
 *
 * A layer that materializes a directory per resource - one folder per agent
 * skill, say - would otherwise leave empty folders behind when the selection
 * changes. Directories that still hold project files are left alone, and the
 * walk stops at the project root.
 */
async function pruneEmptyDirectories(
  directory: string,
  root: string,
): Promise<void> {
  let current = directory;

  while (current !== root && relative(root, current).startsWith('..') === false) {
    const entries = await readdir(current).catch(() => undefined);

    if (!entries || entries.length > 0) {
      return;
    }

    await rmdir(current).catch(() => undefined);
    current = dirname(current);
  }
}

/**
 * Computes the hash used to detect drift in managed files.
 *
 * @param content - File content.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}
