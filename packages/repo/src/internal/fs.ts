import { createHash } from 'node:crypto';
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
 * Reads a file without text decoding.
 *
 * @param path - Absolute filesystem path.
 * @returns Exact file bytes.
 */
export async function readBinaryFile(path: string): Promise<Uint8Array> {
  return readFile(path);
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
 * Recursively lists regular files below a directory.
 *
 * Returned paths are relative to `directory` and use the host platform's path
 * separators. Symbolic links are intentionally ignored so a distributed
 * resource catalog cannot escape its package root through symlink traversal.
 *
 * @param directory - Absolute directory to traverse.
 * @returns Sorted repository-relative file paths.
 */
export async function listFilesRecursive(
  directory: string,
): Promise<string[]> {
  const files: string[] = [];

  async function visit(currentDirectory: string, prefix: string): Promise<void> {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = join(currentDirectory, entry.name);
      const relativePath = prefix ? join(prefix, entry.name) : entry.name;

      if (entry.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await visit(directory, '');
  return files;
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
  await writeFileAtomic(path, content);
}

/**
 * Writes text or binary data atomically where possible.
 *
 * Parent directories are created automatically. The exact supplied bytes are
 * preserved for binary resources such as skill assets.
 *
 * @param path - Absolute destination path.
 * @param content - Text or exact bytes to write.
 */
export async function writeFileAtomic(
  path: string,
  content: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const tempPath = `${path}.repo-tooling-tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, content);
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
 * Computes a deterministic SHA-256 hash for text or binary content.
 *
 * @param content - Content to hash.
 * @returns Lowercase hexadecimal SHA-256 digest.
 */
export function sha256(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex');
}
