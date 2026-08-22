import { join, relative, resolve } from 'node:path';

import { createDefu } from 'defu';
import picomatch from 'picomatch';

import type { CatalogEntry, ResolvedCatalog, ScaffoldSource } from './catalog.js';
import { listFilesRecursive, readBinaryFile, readTextFile } from './fs.js';
import type {
  ProjectScaffold,
  ScaffoldFileRule,
  ScaffoldLayer,
} from './schema.js';
import { type ScopedAnswers, variablesForLayer } from './scope.js';
import {
  evaluateCondition,
  renderTemplate,
  type TemplateVariables,
} from './template.js';

const TEMPLATE_SUFFIX = '.tmpl';

/** One file a scaffold will write, after templates and merging. */
export interface PlannedFile {
  /** Path relative to the project root, using `/` separators. */
  path: string;
  /** Final file content. */
  content: string | Uint8Array;
  /** Layer IDs that contributed to this file, in application order. */
  contributors: string[];
  /** Whether the file stays tool-owned after it is written. */
  managed: boolean;
}

/**
 * Composes a scaffold's layers into the exact set of files to write.
 *
 * Layers are applied in declaration order. When two layers target the same
 * path, JSON targets are deep-merged - so a `testing` layer can add scripts and
 * dev dependencies to the base `package.json` - and any other target is
 * replaced by the later layer.
 *
 * @param entry - Scaffold being planned, used for file rules and messages.
 * @param layers - Layers to compose, in application order.
 * @param answers - Scoped answers; each layer renders with the shared scope
 *   plus its own.
 * @returns Files to write, sorted by path.
 * @throws {Error} When a layer is missing or a template fails to render.
 */
export async function planProject(
  entry: CatalogEntry<ProjectScaffold>,
  layers: readonly CatalogEntry<ScaffoldLayer>[],
  answers: ScopedAnswers,
): Promise<PlannedFile[]> {
  const files = await planLayers(layers, answers, entry.value.files);

  if (files.length === 0) {
    throw new Error(
      `Scaffold "${entry.id}" produced no files for the given answers.`,
    );
  }

  return files;
}

/**
 * Composes a list of layers into the files they produce.
 *
 * This is the shared step behind creating a project, applying a layer, and
 * synchronizing managed layers: all three differ only in how the resulting
 * files are written.
 *
 * @param layers - Layers to compose, in application order.
 * @param answers - Scoped answers; each layer renders with the shared scope
 *   plus its own.
 * @param extraRules - Additional file rules applied to every layer.
 * @returns Files to write, sorted by path.
 * @throws {Error} When a template fails to render.
 */
export async function planLayers(
  layers: readonly CatalogEntry<ScaffoldLayer>[],
  answers: ScopedAnswers,
  extraRules: readonly ScaffoldFileRule[] = [],
): Promise<PlannedFile[]> {
  const planned = new Map<string, PlannedFile>();

  for (const layer of layers) {
    const variables = variablesForLayer(answers, layer.id);
    const directory = resolveLayerDirectory(layer.source, layer.value.source);
    const rules = [...layer.value.files, ...extraRules];

    for (const sourceFile of await listFilesRecursive(directory)) {
      const relativePath = toTargetPath(sourceFile);

      if (!isIncluded(relativePath, rules, variables)) {
        continue;
      }

      const path = layer.value.target
        ? `${layer.value.target.replace(/\/$/, '')}/${relativePath}`
        : relativePath;
      const absolutePath = join(directory, sourceFile);
      const content = await readContent(
        absolutePath,
        sourceFile,
        path,
        variables,
      );

      planned.set(path, mergePlannedFile(
        planned.get(path),
        {
          path,
          content,
          contributors: [layer.id],
          managed: layer.value.managed,
        },
      ));
    }
  }

  return [...planned.values()].sort((left, right) => (
    left.path.localeCompare(right.path)
  ));
}

/**
 * Merges a planned file into a project file that already exists.
 *
 * JSON files are merged with the existing content taking precedence, so
 * applying a layer to an existing project adds what is missing without
 * overwriting local choices.
 *
 * @param existing - Current file content.
 * @param planned - Planned file content.
 * @returns Merged content, or `undefined` when the file cannot be merged.
 */
export function mergeIntoExisting(
  existing: string,
  planned: PlannedFile,
): string | undefined {
  if (!isMergeable(planned.path) || typeof planned.content !== 'string') {
    return undefined;
  }

  const base = parseJson(existing, planned.path);

  return stringifyJson(orderLike(
    deepMerge(base, parseJson(planned.content, planned.path)),
    base,
  ));
}

/**
 * Resolves the layers a scaffold contributes for the given answers.
 *
 * @param entry - Scaffold to resolve.
 * @param catalog - Merged catalog used to look up layer references.
 * @param variables - Answers evaluated against each layer's `when` condition.
 * @returns Included layers in application order.
 * @throws {Error} When a referenced layer does not exist.
 */
export function resolveLayers(
  entry: CatalogEntry<ProjectScaffold>,
  catalog: ResolvedCatalog,
  variables: TemplateVariables,
): CatalogEntry<ScaffoldLayer>[] {
  const layers: CatalogEntry<ScaffoldLayer>[] = [];

  for (const reference of entry.value.layers) {
    if (reference.when && !evaluateCondition(reference.when, variables)) {
      continue;
    }

    const layer = catalog.layers.get(reference.id);

    if (!layer) {
      throw new Error(
        `Scaffold "${entry.id}" references unknown layer "${reference.id}".`,
      );
    }

    layers.push(layer);
  }

  return layers;
}

function resolveLayerDirectory(source: ScaffoldSource, path: string): string {
  const directory = resolve(source.root, path);
  const pathFromRoot = relative(resolve(source.root), directory);

  if (pathFromRoot.startsWith('..')) {
    throw new Error(`Layer source "${path}" escapes its scaffold source.`);
  }

  return directory;
}

/**
 * Reads a layer file as a template, as text, or as exact bytes.
 *
 * Mergeable targets are always read as text, even when they are not templates,
 * so a plain `tsconfig.json` contributed by one layer can still be merged with
 * the fragment contributed by another.
 */
async function readContent(
  absolutePath: string,
  sourceFile: string,
  targetPath: string,
  variables: TemplateVariables,
): Promise<string | Uint8Array> {
  if (sourceFile.endsWith(TEMPLATE_SUFFIX)) {
    return renderTemplate(await readTextFile(absolutePath), variables);
  }

  return isMergeable(targetPath)
    ? readTextFile(absolutePath)
    : readBinaryFile(absolutePath);
}

function isMergeable(targetPath: string): boolean {
  return targetPath.endsWith('.json');
}

function toTargetPath(sourceFile: string): string {
  return sourceFile.endsWith(TEMPLATE_SUFFIX)
    ? sourceFile.slice(0, -TEMPLATE_SUFFIX.length)
    : sourceFile;
}

function isIncluded(
  path: string,
  rules: readonly ScaffoldFileRule[],
  variables: TemplateVariables,
): boolean {
  return rules.every((rule) => (
    !picomatch.isMatch(path, rule.path, { dot: true })
    || evaluateCondition(rule.when, variables)
  ));
}

function mergePlannedFile(
  existing: PlannedFile | undefined,
  planned: PlannedFile,
): PlannedFile {
  if (!existing) {
    return planned;
  }

  const contributors = [...existing.contributors, ...planned.contributors];
  const managed = existing.managed || planned.managed;

  if (
    !isMergeable(planned.path)
    || typeof existing.content !== 'string'
    || typeof planned.content !== 'string'
  ) {
    return { ...planned, contributors, managed };
  }

  const base = parseJson(existing.content, planned.path);

  return {
    path: planned.path,
    contributors,
    managed,
    content: stringifyJson(orderLike(
      deepMerge(parseJson(planned.content, planned.path), base),
      base,
    )),
  };
}

/**
 * Merges objects, keeping array entries in contribution order.
 *
 * `defu` puts the higher-priority array first; for scaffolding the earlier
 * layer's entries should stay first, so a base `include: ["src"]` keeps its
 * position when a later layer appends to it. The callback receives the
 * lower-priority value in `target[key]` and the higher-priority one in `value`.
 */
const mergeObjects = createDefu((target, key, value) => {
  const lowerPriority = (target as Record<PropertyKey, unknown>)[key];

  if (Array.isArray(lowerPriority) && Array.isArray(value)) {
    (target as Record<PropertyKey, unknown>)[key] = [
      ...lowerPriority,
      ...value,
    ];
    return true;
  }

  return false;
});

function deepMerge(
  priority: Record<string, unknown>,
  fallback: Record<string, unknown>,
): Record<string, unknown> {
  return dedupeArrays(
    mergeObjects(priority, fallback) as Record<string, unknown>,
  ) as Record<string, unknown>;
}

/**
 * Reorders an object's keys to follow a reference object.
 *
 * Merging must not shuffle a `package.json`: keys already present keep their
 * original position and newly contributed keys are appended.
 */
function orderLike(
  value: Record<string, unknown>,
  reference: Record<string, unknown>,
): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};

  for (const key of Object.keys(reference)) {
    if (key in value) {
      const entry = value[key];
      const referenceEntry = reference[key];
      ordered[key] = isPlainObject(entry) && isPlainObject(referenceEntry)
        ? orderLike(entry, referenceEntry)
        : entry;
    }
  }

  for (const [key, entry] of Object.entries(value)) {
    if (!(key in ordered)) {
      ordered[key] = entry;
    }
  }

  return ordered;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function dedupeArrays(value: unknown): unknown {
  if (Array.isArray(value)) {
    const items = value.map(dedupeArrays);
    return items.every((item) => typeof item === 'string')
      ? [...new Set(items as string[])]
      : items;
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([key, entry]) => [key, dedupeArrays(entry)]),
    );
  }

  return value;
}

function parseJson(content: string, path: string): Record<string, unknown> {
  try {
    const value = JSON.parse(content) as unknown;

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new Error('Expected a JSON object.');
    }

    return value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`Could not merge "${path}".`, { cause: error });
  }
}

const SORTED_FIELDS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

function stringifyJson(value: Record<string, unknown>): string {
  return `${JSON.stringify(sortDependencyFields(value), null, 2)}\n`;
}

/**
 * Sorts dependency maps alphabetically.
 *
 * Layers contribute dependencies in composition order, which would otherwise
 * leave a `package.json` that no package manager would ever produce.
 */
function sortDependencyFields(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...value };

  for (const field of SORTED_FIELDS) {
    const entry = result[field];

    if (!isPlainObject(entry)) {
      continue;
    }

    result[field] = Object.fromEntries(
      Object.entries(entry)
        .sort(([left], [right]) => left.localeCompare(right)),
    );
  }

  return result;
}
