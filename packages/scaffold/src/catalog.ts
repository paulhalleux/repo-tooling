import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { isAbsolute, join, resolve } from 'node:path';

import { downloadTemplate } from 'giget';

import { pathExists, readJsonFile } from './fs.js';
import {
  parseCatalog,
  type ProjectScaffold,
  type ScaffoldCatalog,
  type ScaffoldLayer,
} from './schema.js';

/** File a scaffold source's catalog is read from. */
export const CATALOG_FILE_NAME = 'catalog.json';

/** A directory containing a scaffold catalog and its layer files. */
export interface ScaffoldSource {
  /** Absolute path to the directory holding `catalog.json`. */
  root: string;
  /** Human-readable origin used in messages, for example the original spec. */
  origin: string;
  /**
   * Whether the source is trusted to run post-create actions without asking.
   *
   * Bundled and local sources are trusted; remote sources are not, because
   * their actions execute arbitrary commands on the user's machine.
   */
  trusted: boolean;
}

/** A scaffold together with the source that declares it. */
export interface CatalogEntry<T> {
  id: string;
  value: T;
  source: ScaffoldSource;
}

/** Scaffolds and layers merged across every configured source. */
export interface ResolvedCatalog {
  scaffolds: Map<string, CatalogEntry<ProjectScaffold>>;
  layers: Map<string, CatalogEntry<ScaffoldLayer>>;
}

/**
 * Resolves a scaffold source specification to a local directory.
 *
 * A specification is either a filesystem path (absolute, or starting with `.`
 * or `~`) or any source understood by `giget`, such as
 * `github:owner/repo/scaffolds#main`. Remote sources are downloaded into a
 * cache directory and marked untrusted.
 *
 * @param specification - Path or remote source specification.
 * @param currentDirectory - Directory relative paths are resolved against.
 * @returns Resolved source.
 * @throws {Error} When the source cannot be resolved or holds no catalog.
 */
export async function resolveScaffoldSource(
  specification: string,
  currentDirectory: string,
): Promise<ScaffoldSource> {
  if (isLocalSpecification(specification)) {
    const root = resolve(currentDirectory, specification);

    if (!await pathExists(join(root, CATALOG_FILE_NAME))) {
      throw new Error(
        `Scaffold source "${specification}" has no ${CATALOG_FILE_NAME}.`,
      );
    }

    return { root, origin: specification, trusted: true };
  }

  const cacheDirectory = join(
    tmpdir(),
    'paulhalleux-scaffold',
    createHash('sha256').update(specification).digest('hex').slice(0, 16),
  );

  try {
    const { dir } = await downloadTemplate(specification, {
      dir: cacheDirectory,
      force: true,
    });

    return { root: dir, origin: specification, trusted: false };
  } catch (error) {
    throw new Error(
      `Could not download scaffold source "${specification}".`,
      { cause: error },
    );
  }
}

/**
 * Loads and validates the catalog of a single scaffold source.
 *
 * @param source - Source whose `catalog.json` is read.
 * @returns Validated catalog.
 * @throws {Error} When the catalog is missing or invalid.
 */
export async function loadCatalog(
  source: ScaffoldSource,
): Promise<ScaffoldCatalog> {
  const path = join(source.root, CATALOG_FILE_NAME);

  if (!await pathExists(path)) {
    throw new Error(`Scaffold source "${source.origin}" has no catalog.`);
  }

  return parseCatalog(await readJsonFile(path), source.origin);
}

/**
 * Merges the catalogs of several sources into one lookup table.
 *
 * Sources are applied in order, so a later source may override a scaffold or
 * layer declared by an earlier one. That lets a repository shadow a bundled
 * scaffold with its own variant under the same ID.
 *
 * @param sources - Ordered sources to load.
 * @returns Merged scaffolds and layers.
 */
export async function resolveCatalog(
  sources: readonly ScaffoldSource[],
): Promise<ResolvedCatalog> {
  const scaffolds = new Map<string, CatalogEntry<ProjectScaffold>>();
  const layers = new Map<string, CatalogEntry<ScaffoldLayer>>();

  for (const source of sources) {
    const catalog = await loadCatalog(source);

    for (const [id, value] of Object.entries(catalog.scaffolds)) {
      scaffolds.set(id, { id, value, source });
    }

    for (const [id, value] of Object.entries(catalog.layers)) {
      layers.set(id, { id, value, source });
    }
  }

  return { scaffolds, layers };
}

/**
 * Looks up a scaffold by ID.
 *
 * @param catalog - Merged catalog.
 * @param id - Scaffold ID.
 * @returns The catalog entry.
 * @throws {Error} When no scaffold has that ID.
 */
export function requireScaffold(
  catalog: ResolvedCatalog,
  id: string,
): CatalogEntry<ProjectScaffold> {
  const entry = catalog.scaffolds.get(id);

  if (!entry) {
    const available = [...catalog.scaffolds.keys()].sort().join(', ');
    throw new Error(
      `Unknown project scaffold "${id}". Available scaffolds: ${available}.`,
    );
  }

  return entry;
}

/**
 * Looks up a layer by ID.
 *
 * @param catalog - Merged catalog.
 * @param id - Layer ID.
 * @returns The catalog entry.
 * @throws {Error} When no layer has that ID.
 */
export function requireLayer(
  catalog: ResolvedCatalog,
  id: string,
): CatalogEntry<ScaffoldLayer> {
  const entry = catalog.layers.get(id);

  if (!entry) {
    const available = [...catalog.layers.keys()].sort().join(', ');
    throw new Error(`Unknown layer "${id}". Available layers: ${available}.`);
  }

  return entry;
}

/**
 * Looks up several layers, preserving the requested order.
 *
 * @param catalog - Merged catalog.
 * @param ids - Layer IDs.
 * @returns Catalog entries in the order the IDs were given.
 * @throws {Error} When any ID is unknown.
 */
export function requireLayers(
  catalog: ResolvedCatalog,
  ids: readonly string[],
): CatalogEntry<ScaffoldLayer>[] {
  return ids.map((id) => requireLayer(catalog, id));
}

function isLocalSpecification(specification: string): boolean {
  return specification.startsWith('.')
    || specification.startsWith('~')
    || isAbsolute(specification);
}
