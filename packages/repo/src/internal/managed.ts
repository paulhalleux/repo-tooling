import {
  type CatalogEntry,
  planLayers,
  type PlannedFile,
  requireLayers,
  resolveScopedAnswers,
  type ResolvedCatalog,
  type ScaffoldLayer,
  type ScopedAnswers,
} from '@paulhalleux/scaffold';

import type { RepositoryConfig } from '../types.js';

/** Managed files a repository subscribes to, per contributing layer. */
export interface ManagedPlan {
  /** Files to materialize. */
  files: PlannedFile[];
  /** Subscribed layers that contribute no files for the recorded answers. */
  emptyLayers: string[];
}

/**
 * Plans the managed files a repository subscribes to.
 *
 * Subscribed layers are composed exactly the way `repo create` composes a
 * project, then filtered down to managed files: repository tooling and project
 * scaffolding share one catalog, one renderer, and one composition step, and
 * differ only in whether the result stays tool-owned.
 *
 * A question added to a layer after the repository subscribed falls back to its
 * default, so a new upstream option never silently drops the files it gates.
 *
 * @param catalog - Merged scaffold catalog.
 * @param config - Repository configuration holding layers and answers.
 * @returns Managed files, and any layer that contributes none.
 * @throws {Error} When a subscribed layer is unknown or is not managed.
 */
export async function planManagedFiles(
  catalog: ResolvedCatalog,
  config: RepositoryConfig,
): Promise<ManagedPlan> {
  const layers = requireLayers(catalog, config.layers);
  assertManaged(layers);

  const answers: ScopedAnswers = await resolveScopedAnswers(
    layers,
    config.answers.shared,
    { knownAnswers: config.answers.layers, interactive: false },
  );

  const planned = await planLayers(layers, answers);
  const files = planned.filter((file) => file.managed);
  const contributing = new Set(files.flatMap((file) => file.contributors));

  return {
    files,
    emptyLayers: layers
      .map((layer) => layer.id)
      .filter((id) => !contributing.has(id)),
  };
}

function assertManaged(
  layers: readonly CatalogEntry<ScaffoldLayer>[],
): void {
  const unmanaged = layers
    .filter((layer) => !layer.value.managed)
    .map((layer) => layer.id);

  if (unmanaged.length === 0) {
    return;
  }

  throw new Error(
    `Layer(s) ${unmanaged.join(', ')} are not managed and cannot be `
    + 'synchronized. Materialize them once with "repo apply" instead.',
  );
}
