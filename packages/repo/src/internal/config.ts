import { join } from 'node:path';

import {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
  CURRENT_LOCK_SCHEMA_VERSION,
  LOCK_FILE_NAME,
} from '../constants.js';
import type {
  JsonValue,
  RecordedAnswer,
  RecordedAnswers,
  RepositoryConfig,
  RepositoryLock,
} from '../types.js';
import {
  pathExists,
  readJsonFile,
  writeJsonFileAtomic,
} from './fs.js';

/**
 * Reads and validates repository tooling configuration.
 *
 * @param repositoryRoot - Absolute repository root.
 * @returns Valid repository configuration.
 * @throws {Error} When the configuration is missing or invalid.
 */
export async function readRepositoryConfig(
  repositoryRoot: string,
): Promise<RepositoryConfig> {
  const path = join(repositoryRoot, CONFIG_FILE_NAME);

  if (!await pathExists(path)) {
    throw new Error(
      `Missing ${CONFIG_FILE_NAME}. Run "repo init" first.`,
    );
  }

  return parseRepositoryConfig(await readJsonFile(path));
}

/**
 * Writes repository tooling configuration.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param config - Configuration to persist.
 */
export async function writeRepositoryConfig(
  repositoryRoot: string,
  config: RepositoryConfig,
): Promise<void> {
  await writeJsonFileAtomic(
    join(repositoryRoot, CONFIG_FILE_NAME),
    config as unknown as JsonValue,
  );
}

/**
 * Parses and validates an arbitrary JSON value as repository configuration.
 *
 * Validation intentionally remains dependency-free because this format is
 * small, stable, and controlled by the CLI itself.
 *
 * @param value - Arbitrary JSON value.
 * @returns Validated configuration.
 * @throws {Error} When required fields have invalid shapes.
 */
export function parseRepositoryConfig(
  value: JsonValue,
): RepositoryConfig {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new Error(`${CONFIG_FILE_NAME} must contain a JSON object.`);
  }

  if (
    typeof value.schemaVersion !== 'number'
    || !Number.isInteger(value.schemaVersion)
    || value.schemaVersion < 0
  ) {
    throw new Error(
      `${CONFIG_FILE_NAME}.schemaVersion must be a non-negative integer.`,
    );
  }

  if (value.schemaVersion > CURRENT_CONFIG_SCHEMA_VERSION) {
    throw new Error(
      `${CONFIG_FILE_NAME} uses schema version ${value.schemaVersion}, `
      + `but this CLI only supports up to ${CURRENT_CONFIG_SCHEMA_VERSION}.`,
    );
  }

  if (
    !Array.isArray(value.layers)
    || !value.layers.every((entry) => typeof entry === 'string')
  ) {
    throw new Error(
      `${CONFIG_FILE_NAME}.layers must be an array of strings.`,
    );
  }

  return {
    schemaVersion: value.schemaVersion,
    layers: [...value.layers],
    answers: parseAnswers(value.answers),
  };
}

function parseAnswers(value: JsonValue | undefined): RecordedAnswers {
  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
  ) {
    throw new Error(`${CONFIG_FILE_NAME}.answers must be an object.`);
  }

  // An early version of this schema stored one flat answer bag. Reading it as
  // the shared scope keeps such a file working; each layer's own questions then
  // fall back to their defaults on the next synchronization.
  if (value.shared === undefined && value.layers === undefined) {
    return { shared: parseAnswerRecord(value, 'answers'), layers: {} };
  }

  const layers: Record<string, Record<string, RecordedAnswer>> = {};

  for (const [id, layerAnswers] of Object.entries(value.layers ?? {})) {
    layers[id] = parseAnswerRecord(layerAnswers, `answers.layers.${id}`);
  }

  return {
    shared: parseAnswerRecord(value.shared, 'answers.shared'),
    layers,
  };
}

function parseAnswerRecord(
  value: JsonValue | undefined,
  label: string,
): Record<string, RecordedAnswer> {
  if (value === undefined) {
    return {};
  }

  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${CONFIG_FILE_NAME}.${label} must be an object.`);
  }

  const answers: Record<string, RecordedAnswer> = {};

  for (const [name, answer] of Object.entries(value)) {
    if (
      typeof answer !== 'string'
      && typeof answer !== 'boolean'
      && !(
        Array.isArray(answer)
        && answer.every((entry) => typeof entry === 'string')
      )
    ) {
      throw new Error(
        `${CONFIG_FILE_NAME}.${label}.${name} must be a string, boolean, or `
        + 'array of strings.',
      );
    }

    answers[name] = Array.isArray(answer) ? [...answer] : answer;
  }

  return answers;
}

/**
 * Reads the generated managed-file lock.
 *
 * Missing lock files are treated as an empty lock. An incompatible lock
 * version is rejected rather than guessed.
 *
 * @param repositoryRoot - Absolute repository root.
 * @returns Current managed-file lock state.
 */
export async function readRepositoryLock(
  repositoryRoot: string,
): Promise<RepositoryLock> {
  const path = join(repositoryRoot, LOCK_FILE_NAME);

  if (!await pathExists(path)) {
    return {
      schemaVersion: CURRENT_LOCK_SCHEMA_VERSION,
      files: {},
    };
  }

  const value = await readJsonFile(path);

  if (
    typeof value !== 'object'
    || value === null
    || Array.isArray(value)
    || typeof value.schemaVersion !== 'number'
    || value.schemaVersion > CURRENT_LOCK_SCHEMA_VERSION
    || typeof value.files !== 'object'
    || value.files === null
    || Array.isArray(value.files)
  ) {
    throw new Error(
      `${LOCK_FILE_NAME} is invalid or uses an unsupported schema version.`,
    );
  }

  const files: RepositoryLock['files'] = {};

  for (const [target, rawEntry] of Object.entries(value.files)) {
    if (
      typeof rawEntry !== 'object'
      || rawEntry === null
      || Array.isArray(rawEntry)
      || typeof rawEntry.hash !== 'string'
    ) {
      throw new Error(
        `${LOCK_FILE_NAME} contains an invalid entry for "${target}".`,
      );
    }

    // Version 1 recorded the resource path as "source"; the hash - the part
    // drift detection depends on - is unchanged, so older locks stay usable.
    const layer = typeof rawEntry.layer === 'string'
      ? rawEntry.layer
      : typeof rawEntry.source === 'string'
        ? rawEntry.source
        : '';

    files[target] = { hash: rawEntry.hash, layer };
  }

  return {
    schemaVersion: CURRENT_LOCK_SCHEMA_VERSION,
    files,
  };
}

/**
 * Writes the generated managed-file lock.
 *
 * @param repositoryRoot - Absolute repository root.
 * @param lock - Lock state to persist.
 */
export async function writeRepositoryLock(
  repositoryRoot: string,
  lock: RepositoryLock,
): Promise<void> {
  await writeJsonFileAtomic(
    join(repositoryRoot, LOCK_FILE_NAME),
    lock as unknown as JsonValue,
  );
}
