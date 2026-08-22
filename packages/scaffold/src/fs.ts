import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { dirname, join } from 'node:path';

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
export async function readJsonFile(path: string): Promise<unknown> {
  return JSON.parse(await readTextFile(path)) as unknown;
}

/**
 * Recursively lists regular files below a directory.
 *
 * Returned paths are relative to `directory` and use `/` separators so they can
 * be matched against catalog globs on every platform. Symbolic links are
 * ignored so a scaffold cannot escape its own directory.
 *
 * @param directory - Absolute directory to traverse.
 * @returns Sorted relative file paths.
 */
export async function listFilesRecursive(
  directory: string,
): Promise<string[]> {
  const files: string[] = [];

  async function visit(current: string, prefix: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    entries.sort((left, right) => left.name.localeCompare(right.name));

    for (const entry of entries) {
      const absolutePath = join(current, entry.name);
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

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
 * Writes text or binary data atomically where possible.
 *
 * Parent directories are created automatically. Content is first written to a
 * sibling temporary file and then renamed into place so interrupted writes do
 * not leave a partially written destination.
 *
 * @param path - Absolute destination path.
 * @param content - Text or exact bytes to write.
 */
export async function writeFileAtomic(
  path: string,
  content: string | Uint8Array,
): Promise<void> {
  await mkdir(dirname(path), { recursive: true });

  const tempPath = `${path}.scaffold-tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, content);
  await rename(tempPath, path);
}
