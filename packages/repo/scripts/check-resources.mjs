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

const profileCatalog = await readJsonResource('profiles/catalog.json');
const scaffoldCatalog = await readJsonResource('scaffolds/catalog.json');

const profiles = readRecord(profileCatalog, 'profiles', 'Profile catalog');
const scaffolds = readRecord(
  scaffoldCatalog,
  'scaffolds',
  'Scaffold catalog',
);

for (const [name, profile] of Object.entries(profiles)) {
  assertObject(profile, `Profile "${name}"`);

  for (const parent of readStringArray(profile, 'extends', name)) {
    if (!(parent in profiles)) {
      throw new Error(`Profile "${name}" extends unknown profile "${parent}".`);
    }
  }

  for (const file of readObjectArray(profile, 'files', name)) {
    const source = readString(file, 'source', `Profile "${name}" file`);
    await assertResourceFile(source);
  }

  if (profile.ai !== undefined) {
    assertObject(profile.ai, `Profile "${name}" AI selection`);

    for (const skill of readStringArray(profile.ai, 'skills', name)) {
      await assertResourceDirectory(`ai/skills/${skill}`, true);
    }

    for (const agent of readStringArray(profile.ai, 'agents', name)) {
      await assertResourceFile(`ai/agents/${agent}.toml`);
    }

    for (const instruction of readStringArray(
      profile.ai,
      'instructions',
      name,
    )) {
      await assertResourceFile(`ai/instructions/${instruction}.md`);
    }
  }
}

assertAcyclicProfileInheritance(profiles);

for (const [id, scaffold] of Object.entries(scaffolds)) {
  assertObject(scaffold, `Scaffold "${id}"`);
  const source = readString(scaffold, 'source', `Scaffold "${id}"`);
  await assertResourceDirectory(`scaffolds/${source}`, true);
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

async function assertResourceFile(resource) {
  await assertResourceType(resource, 'file');
}

async function assertResourceDirectory(resource, requireContent = false) {
  const path = await assertResourceType(resource, 'directory');

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

async function assertResourceType(resource, expectedType) {
  const path = resolveResourcePath(resource);

  try {
    const metadata = await stat(path);
    const matches = expectedType === 'file'
      ? metadata.isFile()
      : metadata.isDirectory();

    if (!matches) {
      throw new Error(`Expected a ${expectedType}.`);
    }

    return path;
  } catch (error) {
    throw new Error(
      `Required ${expectedType} resource "${resource}" is invalid.`,
      { cause: error },
    );
  }
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
  assertObject(value, label);
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

function readStringArray(value, key, profileName) {
  const entries = value[key] ?? [];
  if (
    !Array.isArray(entries)
    || !entries.every((entry) => typeof entry === 'string')
  ) {
    throw new Error(
      `Profile "${profileName}".${key} must be an array of strings.`,
    );
  }
  return entries;
}

function readObjectArray(value, key, profileName) {
  const entries = value[key] ?? [];
  if (!Array.isArray(entries)) {
    throw new Error(`Profile "${profileName}".${key} must be an array.`);
  }
  for (const entry of entries) {
    assertObject(entry, `Profile "${profileName}".${key} entry`);
  }
  return entries;
}

function assertObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
}

function assertAcyclicProfileInheritance(allProfiles) {
  const visited = new Set();
  const visiting = new Set();

  const visit = (name) => {
    if (visiting.has(name)) {
      throw new Error(`Profile inheritance cycle detected at "${name}".`);
    }
    if (visited.has(name)) {
      return;
    }

    visiting.add(name);
    const profile = allProfiles[name];
    for (const parent of profile.extends ?? []) {
      visit(parent);
    }
    visiting.delete(name);
    visited.add(name);
  };

  for (const name of Object.keys(allProfiles)) {
    visit(name);
  }
}
