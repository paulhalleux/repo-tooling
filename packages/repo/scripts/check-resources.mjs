import { readFile, readdir, stat } from 'node:fs/promises';
import {
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDirectory = dirname(dirname(fileURLToPath(import.meta.url)));
const resourcesDirectory = join(packageDirectory, 'resources');

const catalog = await readJsonResource('catalog.json');

assertObject(catalog, 'Catalog');
const layers = readRecord(catalog, 'layers', 'Catalog');
const scaffolds = readRecord(catalog, 'scaffolds', 'Catalog');

for (const [id, layer] of Object.entries(layers)) {
  assertObject(layer, `Layer "${id}"`);
  await assertResourceDirectory(
    readString(layer, 'source', `Layer "${id}"`),
    true,
  );

  if (layer.target !== undefined) {
    readString(layer, 'target', `Layer "${id}"`);
  }

  if (layer.managed !== undefined && typeof layer.managed !== 'boolean') {
    throw new Error(`Layer "${id}".managed must be a boolean.`);
  }
}

for (const [id, scaffold] of Object.entries(scaffolds)) {
  assertObject(scaffold, `Scaffold "${id}"`);
  readString(scaffold, 'description', `Scaffold "${id}"`);
  const references = scaffold.layers ?? [];

  if (!Array.isArray(references) || references.length === 0) {
    throw new Error(`Scaffold "${id}".layers must be a non-empty array.`);
  }

  for (const reference of references) {
    const layerId = typeof reference === 'string'
      ? reference
      : readString(reference, 'id', `Scaffold "${id}" layer`);

    if (!(layerId in layers)) {
      throw new Error(`Scaffold "${id}" references unknown layer "${layerId}".`);
    }
  }
}

async function readJsonResource(resource) {
  const path = resolveResourcePath(resource);

  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Could not read JSON resource "${resource}".`, {
      cause: error,
    });
  }
}

async function assertResourceDirectory(resource, requireContent = false) {
  const path = resolveResourcePath(resource);

  try {
    const metadata = await stat(path);

    if (!metadata.isDirectory()) {
      throw new Error('Expected a directory.');
    }
  } catch (error) {
    throw new Error(`Required directory resource "${resource}" is invalid.`, {
      cause: error,
    });
  }

  if (requireContent && !await directoryContainsFile(path)) {
    throw new Error(`Resource directory "${resource}" contains no files.`);
  }
}

async function directoryContainsFile(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile()) {
      return true;
    }
    if (
      entry.isDirectory()
      && await directoryContainsFile(join(directory, entry.name))
    ) {
      return true;
    }
  }

  return false;
}

function resolveResourcePath(resource) {
  if (typeof resource !== 'string' || !resource) {
    throw new Error('Resource paths must be non-empty strings.');
  }

  const path = resolve(resourcesDirectory, resource);
  const pathFromRoot = relative(resourcesDirectory, path);

  if (
    isAbsolute(resource)
    || pathFromRoot === '..'
    || pathFromRoot.startsWith(`..${sep}`)
  ) {
    throw new Error(`Resource path "${resource}" escapes the package.`);
  }

  return path;
}

function readRecord(value, key, label) {
  const record = value[key];
  assertObject(record, `${label}.${key}`);
  return record;
}

function readString(value, key, label) {
  const result = value[key];

  if (typeof result !== 'string') {
    throw new Error(`${label}.${key} must be a string.`);
  }

  return result;
}

function assertObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}
