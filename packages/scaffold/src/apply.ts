import { mkdir, mkdtemp, readdir, rename, rm, rmdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

import { pathExists, readTextFile, writeFileAtomic } from './fs.js';
import { mergeIntoExisting, type PlannedFile } from './plan.js';

/** How planned files are written to disk. */
export type WriteMode =
  /** The destination must not exist or must be empty. */
  | 'create'
  /** Files are layered onto an existing project. */
  | 'apply';

/** Options controlling how a plan is written. */
export interface WritePlanOptions {
  /** Absolute destination directory. */
  destination: string;
  /** Whether the destination is a new or an existing project. */
  mode: WriteMode;
  /** Overwrite files that differ instead of reporting them as conflicts. */
  force?: boolean;
  /** Report what would change without touching the filesystem. */
  dryRun?: boolean;
}

/** Outcome of writing a plan. */
export interface WriteResult {
  /** Files that did not exist before. */
  created: string[];
  /** Existing files that were merged or overwritten. */
  updated: string[];
  /** Files left untouched because they already match. */
  unchanged: string[];
  /** Files that differ and were not overwritten. */
  conflicts: string[];
}

/**
 * Writes a planned file set to disk.
 *
 * In `create` mode the whole project is staged in a temporary directory and
 * moved into place, so a failure never leaves a half-written project. In
 * `apply` mode files are layered onto a project directory, which is created if
 * it does not exist yet: missing files are created, JSON files are merged with
 * existing values winning, and any other file that differs is reported as a
 * conflict unless `force` is set.
 *
 * @param files - Planned files.
 * @param options - Destination, mode, and safety switches.
 * @returns What was created, updated, left alone, or conflicted.
 * @throws {Error} When the destination is unusable for the chosen mode.
 */
export async function writePlan(
  files: readonly PlannedFile[],
  options: WritePlanOptions,
): Promise<WriteResult> {
  const destination = resolve(options.destination);

  return options.mode === 'create'
    ? writeNewProject(files, destination, options)
    : applyToExistingProject(files, destination, options);
}

async function writeNewProject(
  files: readonly PlannedFile[],
  destination: string,
  options: WritePlanOptions,
): Promise<WriteResult> {
  const destinationExists = await assertDestinationIsEmpty(destination);
  const result: WriteResult = {
    created: files.map((file) => file.path),
    updated: [],
    unchanged: [],
    conflicts: [],
  };

  if (options.dryRun) {
    return result;
  }

  const parent = dirname(destination);
  await mkdir(parent, { recursive: true });
  const staging = await mkdtemp(
    join(parent, `.${basename(destination)}.scaffold-`),
  );

  try {
    for (const file of files) {
      await writeFileAtomic(join(staging, file.path), file.content);
    }

    if (destinationExists) {
      await rmdir(destination);
    }

    await rename(staging, destination);
  } catch (error) {
    await rm(staging, { recursive: true, force: true });

    if (destinationExists && !await pathExists(destination)) {
      await mkdir(destination);
    }

    throw error;
  }

  return result;
}

async function applyToExistingProject(
  files: readonly PlannedFile[],
  destination: string,
  options: WritePlanOptions,
): Promise<WriteResult> {
  if (!await pathExists(destination) && !options.dryRun) {
    await mkdir(destination, { recursive: true });
  }

  const result: WriteResult = {
    created: [],
    updated: [],
    unchanged: [],
    conflicts: [],
  };

  for (const file of files) {
    const path = join(destination, file.path);

    if (!await pathExists(path)) {
      result.created.push(file.path);

      if (!options.dryRun) {
        await writeFileAtomic(path, file.content);
      }

      continue;
    }

    const existing = await readTextFile(path).catch(() => undefined);

    if (existing !== undefined && matches(existing, file.content)) {
      result.unchanged.push(file.path);
      continue;
    }

    const merged = existing === undefined
      ? undefined
      : mergeIntoExisting(existing, file);

    if (merged !== undefined) {
      if (merged === existing) {
        result.unchanged.push(file.path);
        continue;
      }

      result.updated.push(file.path);

      if (!options.dryRun) {
        await writeFileAtomic(path, merged);
      }

      continue;
    }

    if (!options.force) {
      result.conflicts.push(file.path);
      continue;
    }

    result.updated.push(file.path);

    if (!options.dryRun) {
      await writeFileAtomic(path, file.content);
    }
  }

  return result;
}

function matches(existing: string, content: string | Uint8Array): boolean {
  return typeof content === 'string'
    ? existing === content
    : existing === Buffer.from(content).toString('utf8');
}

async function assertDestinationIsEmpty(
  destination: string,
): Promise<boolean> {
  if (!await pathExists(destination)) {
    return false;
  }

  const entries = await readdir(destination);

  if (entries.length > 0) {
    throw new Error(`Destination "${destination}" is not empty.`);
  }

  return true;
}
