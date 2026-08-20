import {
  mkdir,
  mkdtemp,
  readdir,
  rename,
  rm,
  rmdir,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';

import type { JsonValue } from '../types.js';
import {
  listFilesRecursive,
  pathExists,
  readBinaryFile,
  readJsonFile,
  readTextFile,
  writeFileAtomic,
} from './fs.js';
import { renderTemplate } from './template.js';
import { RESOURCES_DIRECTORY } from './resources.js';

const TEMPLATE_SUFFIX = '.tmpl';

/** A project scaffold bundled with the CLI. */
export interface ProjectScaffold {
  /** Directory below the distributed scaffold resource root. */
  source: string;
  /** Short description shown by `repo create --list`. */
  description: string;
}

/** Catalog of project scaffolds keyed by slash-delimited ID. */
export interface ProjectScaffoldCatalog {
  scaffolds: Record<string, ProjectScaffold>;
}

/** Absolute path to the distributed scaffold resource root. */
export const SCAFFOLDS_DIRECTORY = join(
  RESOURCES_DIRECTORY,
  'scaffolds',
);

const SCAFFOLD_CATALOG_PATH = join(SCAFFOLDS_DIRECTORY, 'catalog.json');

/** Loads and validates the project scaffold catalog bundled with the CLI. */
export async function loadScaffoldCatalog(): Promise<ProjectScaffoldCatalog> {
  const value = await readJsonFile(SCAFFOLD_CATALOG_PATH);

  if (!isJsonObject(value) || !isJsonObject(value.scaffolds)) {
    throw new Error('The bundled project scaffold catalog is invalid.');
  }

  const scaffolds: Record<string, ProjectScaffold> = {};

  for (const [id, rawScaffold] of Object.entries(value.scaffolds)) {
    if (
      !isValidScaffoldId(id)
      || !isJsonObject(rawScaffold)
      || typeof rawScaffold.source !== 'string'
      || typeof rawScaffold.description !== 'string'
    ) {
      throw new Error(`Project scaffold "${id}" is invalid.`);
    }

    assertSafeRelativePath(rawScaffold.source, `Scaffold "${id}" source`);
    scaffolds[id] = {
      source: rawScaffold.source,
      description: rawScaffold.description,
    };
  }

  return { scaffolds };
}

/**
 * Resolves either `<scaffold> <directory>` or `<scaffold>/<directory>` input.
 */
export function resolveScaffoldRequest(
  scaffoldArgument: string,
  directoryArgument: string | undefined,
  catalog: ProjectScaffoldCatalog,
): { scaffoldId: string; directory: string } {
  if (directoryArgument) {
    if (!catalog.scaffolds[scaffoldArgument]) {
      throw unknownScaffoldError(scaffoldArgument, catalog);
    }

    return { scaffoldId: scaffoldArgument, directory: directoryArgument };
  }

  const scaffoldId = Object.keys(catalog.scaffolds)
    .sort((left, right) => right.length - left.length)
    .find((id) => scaffoldArgument.startsWith(`${id}/`));

  if (!scaffoldId) {
    if (catalog.scaffolds[scaffoldArgument]) {
      throw new Error(
        `Missing project directory. Run "repo create ${scaffoldArgument} <directory>".`,
      );
    }

    throw unknownScaffoldError(scaffoldArgument, catalog);
  }

  const directory = scaffoldArgument.slice(scaffoldId.length + 1);

  if (!directory) {
    throw new Error(
      `Missing project directory. Run "repo create ${scaffoldId} <directory>".`,
    );
  }

  return { scaffoldId, directory };
}

/** Materializes a scaffold into a new or empty destination directory. */
export async function createProjectFromScaffold(
  scaffoldId: string,
  scaffold: ProjectScaffold,
  destination: string,
  variables: Readonly<Record<string, string>>,
): Promise<string[]> {
  const absoluteDestination = resolve(destination);
  const destinationExists = await assertDestinationIsEmpty(
    absoluteDestination,
  );

  const sourceDirectory = resolve(SCAFFOLDS_DIRECTORY, scaffold.source);
  assertPathWithin(SCAFFOLDS_DIRECTORY, sourceDirectory, 'Scaffold source');

  const sourceFiles = await listFilesRecursive(sourceDirectory);
  const renderedFiles = await Promise.all(sourceFiles.map(async (sourceFile) => {
    const targetFile = sourceFile.endsWith(TEMPLATE_SUFFIX)
      ? sourceFile.slice(0, -TEMPLATE_SUFFIX.length)
      : sourceFile;
    assertSafeRelativePath(targetFile, 'Scaffold target');

    const sourcePath = join(sourceDirectory, sourceFile);
    const content = sourceFile.endsWith(TEMPLATE_SUFFIX)
      ? renderTemplate(await readTextFile(sourcePath), variables)
      : await readBinaryFile(sourcePath);

    return { targetFile, content };
  }));

  if (renderedFiles.length === 0) {
    throw new Error(`Project scaffold "${scaffoldId}" contains no files.`);
  }

  const targetFiles = new Set<string>();
  for (const file of renderedFiles) {
    if (targetFiles.has(file.targetFile)) {
      throw new Error(
        `Project scaffold "${scaffoldId}" contains duplicate target `
        + `"${file.targetFile}".`,
      );
    }
    targetFiles.add(file.targetFile);
  }

  const destinationParent = dirname(absoluteDestination);
  await mkdir(destinationParent, { recursive: true });
  const stagingDirectory = await mkdtemp(
    join(destinationParent, `.${basename(absoluteDestination)}.repo-create-`),
  );

  try {
    for (const file of renderedFiles) {
      await writeFileAtomic(
        join(stagingDirectory, file.targetFile),
        file.content,
      );
    }

    if (destinationExists) {
      await rmdir(absoluteDestination);
    }

    await rename(stagingDirectory, absoluteDestination);
  } catch (error) {
    await rm(stagingDirectory, { recursive: true, force: true });

    if (destinationExists && !await pathExists(absoluteDestination)) {
      await mkdir(absoluteDestination);
    }

    throw error;
  }

  return renderedFiles.map((file) => file.targetFile);
}

/** Derives the unscoped project name from a destination path. */
export function deriveProjectName(destination: string): string {
  const name = basename(resolve(destination));

  if (!name || name === '.' || name === sep) {
    throw new Error(`Could not derive a project name from "${destination}".`);
  }

  return name;
}

async function assertDestinationIsEmpty(destination: string): Promise<boolean> {
  if (!await pathExists(destination)) {
    return false;
  }

  const entries = await readdir(destination);
  if (entries.length > 0) {
    throw new Error(`Destination "${destination}" is not empty.`);
  }

  return true;
}

function assertSafeRelativePath(path: string, label: string): void {
  const normalized = relative('.', resolve('.', path));

  if (
    !path
    || isAbsolute(path)
    || normalized === '..'
    || normalized.startsWith(`..${sep}`)
  ) {
    throw new Error(`${label} must be a safe relative path.`);
  }
}

function assertPathWithin(parent: string, child: string, label: string): void {
  const pathFromParent = relative(resolve(parent), resolve(child));

  if (pathFromParent === '..' || pathFromParent.startsWith(`..${sep}`)) {
    throw new Error(`${label} escapes the distributed scaffold directory.`);
  }
}

function unknownScaffoldError(
  id: string,
  catalog: ProjectScaffoldCatalog,
): Error {
  return new Error(
    `Unknown project scaffold "${id}". Available scaffolds: ${Object.keys(catalog.scaffolds).sort().join(', ')}.`,
  );
}

function isValidScaffoldId(value: string): boolean {
  return /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/.test(value);
}

function isJsonObject(
  value: JsonValue | undefined,
): value is { [key: string]: JsonValue } {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
