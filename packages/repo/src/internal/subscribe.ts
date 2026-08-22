import { join } from 'node:path';

import {
  type CatalogEntry,
  type ProjectScaffold,
  type ResolvedCatalog,
  type ScopedAnswers,
  syncPlan,
} from '@paulhalleux/scaffold';

import {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
  CURRENT_LOCK_SCHEMA_VERSION,
} from '../constants.js';
import type { RecordedAnswer, RepositoryConfig } from '../types.js';
import {
  readRepositoryConfig,
  readRepositoryLock,
  writeRepositoryConfig,
  writeRepositoryLock,
} from './config.js';
import { pathExists } from './fs.js';
import { planManagedFiles } from './managed.js';

/**
 * Records the managed layers a project uses, and locks their current state.
 *
 * A managed layer is a subscription rather than a one-off copy: recording it is
 * what lets a later `repo sync` keep those files current. Creating a project
 * that ships managed layers therefore subscribes it from birth, and applying a
 * managed layer to an existing project extends its subscription.
 *
 * Projects made only of unmanaged layers get no configuration file - they are
 * handed over on write and never touched again.
 *
 * @param destination - Absolute project directory.
 * @param entry - Scaffold or layer that was materialized.
 * @param catalog - Merged catalog the layers came from.
 * @param answers - Scoped answers the project was rendered with.
 * @returns Layer IDs newly subscribed to.
 */
export async function subscribeManagedLayers(
  destination: string,
  entry: CatalogEntry<ProjectScaffold>,
  catalog: ResolvedCatalog,
  answers: ScopedAnswers,
): Promise<string[]> {
  const managedIds = entry.value.layers
    .map((reference) => reference.id)
    .filter((id) => catalog.layers.get(id)?.value.managed);

  if (managedIds.length === 0) {
    return [];
  }

  const existing = await pathExists(join(destination, CONFIG_FILE_NAME))
    ? await readRepositoryConfig(destination)
    : undefined;

  const layers = [...existing?.layers ?? []];

  for (const id of managedIds) {
    if (!layers.includes(id)) {
      layers.push(id);
    }
  }

  const config: RepositoryConfig = {
    schemaVersion: CURRENT_CONFIG_SCHEMA_VERSION,
    layers,
    answers: {
      shared: {
        ...existing?.answers.shared,
        ...answers.shared as Record<string, RecordedAnswer>,
      },
      layers: {
        ...existing?.answers.layers,
        ...answers.layers as Record<string, Record<string, RecordedAnswer>>,
      },
    },
  };

  await writeRepositoryConfig(destination, config);
  await lockManagedFiles(destination, catalog, config);

  return managedIds.filter((id) => !existing?.layers.includes(id));
}

/**
 * Records the state of managed files without touching them.
 *
 * Writing already happened, so this pass runs in check mode purely to capture
 * hashes. It must never write: subscribing to one layer would otherwise
 * overwrite a hand-edited file belonging to another layer the project already
 * subscribed to. A file that differs keeps its previously locked hash, so the
 * next `repo sync` reports it as a conflict instead of silently replacing it.
 */
async function lockManagedFiles(
  destination: string,
  catalog: ResolvedCatalog,
  config: RepositoryConfig,
): Promise<void> {
  const { files } = await planManagedFiles(catalog, config);
  const lock = await readRepositoryLock(destination);
  const { managed } = await syncPlan(files, {
    destination,
    previous: lock.files,
    check: true,
  });

  await writeRepositoryLock(destination, {
    schemaVersion: CURRENT_LOCK_SCHEMA_VERSION,
    files: managed,
  });
}
