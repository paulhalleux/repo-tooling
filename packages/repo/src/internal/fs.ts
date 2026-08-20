import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname } from 'node:path';

import type { JsonValue } from '../types.js';

/**
 * Tests whether a filesystem path exists.
 *
 * @param path - Absolute filesystem path.
 * @returns `true` when the path exists; otherwise `false`.
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads a UTF-8 text file.
 *
 * @param path - Absolute filesystem path.
 * @returns File contents.
 */
export async function readTextFile(path: string): Promise<string> {
  return readFile(path, 'utf8');
}

/**
 * Reads and parses a JSON file.
 *
 * @param path - Absolute filesystem path.
 * @returns Parsed JSON value.
 * @throws {SyntaxError} When the file does not contain valid JSON.
 */
export async function readJsonFile(path: string): Promise<JsonValue> {
  return JSON.parse(await readTextFile(path)) as JsonValue;
}

/**
 * Writes a text file atomically where possible.
 *
 * Parent directories are created automatically. Content is first written to a
 * sibling temporary file and then renamed into place so interrupted writes do
 * not normally leave a partially written destination.
 *
 * @param path - Absolute destination path.
 * @param content - Exact file content.
 */
export async function writeTextFileAtomic(
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const tempPath = `${path}.repo-tooling-tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, content, 'utf8');
  await rename(tempPath, path);
}

/**
 * Serializes and atomically writes a JSON value.
 *
 * @param path - Absolute destination path.
 * @param value - JSON-compatible value to serialize.
 */
export async function writeJsonFileAtomic(
  path: string,
  value: JsonValue,
): Promise<void> {
  await writeTextFileAtomic(path, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Removes a file if it exists.
 *
 * @param path - Absolute path of the file to remove.
 */
export async function removeFile(path: string): Promise<void> {
  await rm(path, { force: true });
}

/**
 * Computes a deterministic SHA-256 hash for text content.
 *
 * @param content - Content to hash.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function sha256(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}
