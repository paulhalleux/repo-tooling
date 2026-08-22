import { basename, join, resolve } from 'node:path';

import {
  askQuestion,
  type CatalogEntry,
  isInteractive,
  type ProjectScaffold,
  prepareProject,
  type ResolvedCatalog,
  runActions,
  type TemplateVariables,
  writePlan,
} from '@paulhalleux/scaffold';
import { intro, log, outro } from '@clack/prompts';
import pc from 'picocolors';

import { readRepositoryConfig } from '../internal/config.js';
import { CONFIG_FILE_NAME } from '../constants.js';
import type { RecordedAnswers } from '../types.js';
import { pathExists, readJsonFile } from '../internal/fs.js';
import { resolveScaffoldSources } from '../internal/scaffold-sources.js';
import { subscribeManagedLayers } from '../internal/subscribe.js';

/** Options accepted by the `repo apply` command. */
export interface ApplyCommandOptions {
  /** Scaffold or layer ID to apply. */
  target: string;
  /** Project directory to apply it to. */
  directory?: string;
  /** Pre-supplied answers keyed by question name. */
  answers?: Record<string, string>;
  /** Extra scaffold sources: local paths or `giget` specifications. */
  sources?: string[];
  /** Accept every default instead of asking questions. */
  yes?: boolean;
  /** Overwrite files that differ instead of reporting conflicts. */
  force?: boolean;
  /** Report what would change without writing anything. */
  dryRun?: boolean;
  /** Run post-create actions. */
  actions?: boolean;
  /** Allow actions declared by untrusted (remote) sources to run. */
  allowRemoteActions?: boolean;
}

/**
 * Layers a scaffold or a single layer onto an existing project.
 *
 * Missing files are created, JSON files are merged with the project's own
 * values winning, and any other file that differs is reported as a conflict
 * rather than silently overwritten.
 */
export async function runApplyCommand(
  currentDirectory: string,
  options: ApplyCommandOptions,
): Promise<void> {
  const { catalog } = await resolveScaffoldSources(
    currentDirectory,
    options.sources ?? [],
  );

  const entry = resolveTarget(catalog, options.target);
  const destination = resolve(currentDirectory, options.directory ?? '.');
  const interactive = isInteractive() && options.yes !== true;

  if (interactive) {
    intro(pc.bgCyan(pc.black(` repo apply ${options.target} `)));

    if (!await confirmDestination(options, destination)) {
      outro('Cancelled.');
      return;
    }
  }

  const recorded = await readRecordedAnswers(destination);
  const project = await prepareProject(entry, catalog, {
    presetAnswers: options.answers ?? {},
    knownAnswers: recorded.shared,
    knownLayerAnswers: recorded.layers,
    baseVariables: await readProjectVariables(destination),
    interactive,
  });

  const result = await writePlan(project.files, {
    destination,
    mode: 'apply',
    ...(options.force ? { force: true } : {}),
    ...(options.dryRun ? { dryRun: true } : {}),
  });

  report('created', result.created, pc.green);
  report('updated', result.updated, pc.cyan);
  report('unchanged', result.unchanged, pc.dim);
  report('conflict', result.conflicts, pc.yellow);

  if (result.conflicts.length > 0) {
    console.warn(
      `${pc.yellow('warn')} ${result.conflicts.length} file(s) already exist `
      + 'and differ. Re-run with --force to overwrite them.',
    );
  }

  const actions = await runActions(project.actions, {
    cwd: destination,
    variables: project.variables,
    execute: canRunActions(entry, options),
    ...(interactive ? { onStep: (label) => log.step(label) } : {}),
  });

  for (const message of actions.messages) {
    console.log(message);
  }

  if (!options.dryRun) {
    const subscribed = await subscribeManagedLayers(
      destination,
      entry,
      catalog,
      project.answers,
    );

    if (subscribed.length > 0) {
      console.log(
        `${pc.green('subscribed')} ${subscribed.join(', ')} `
        + '(kept current by "repo sync")',
      );
    }
  }

  if (interactive) {
    outro(options.dryRun ? 'Dry run complete.' : 'Done.');
  }
}

/**
 * Reads the answers a project already recorded, if it has any.
 *
 * Re-applying a layer must reuse the answers the project was set up with;
 * otherwise a question the user answered once would silently fall back to its
 * default and re-render managed files with different content.
 */
async function readRecordedAnswers(
  destination: string,
): Promise<RecordedAnswers> {
  if (!await pathExists(join(destination, CONFIG_FILE_NAME))) {
    return { shared: {}, layers: {} };
  }

  return (await readRepositoryConfig(destination)).answers;
}

/**
 * Confirms an implicit destination before modifying a project.
 *
 * `repo apply` defaults to the current directory and edits files in place, so
 * an accidental run in the wrong directory is easy and unpleasant. An explicit
 * directory argument is taken at face value.
 */
async function confirmDestination(
  options: ApplyCommandOptions,
  destination: string,
): Promise<boolean> {
  if (options.directory || options.dryRun) {
    return true;
  }

  return await askQuestion({
    type: 'confirm',
    name: 'confirmed',
    message: `Apply "${options.target}" to ${destination}?`,
    default: true,
  }) === true;
}

function resolveTarget(
  catalog: ResolvedCatalog,
  target: string,
): CatalogEntry<ProjectScaffold> {
  const scaffold = catalog.scaffolds.get(target);

  if (scaffold) {
    return scaffold;
  }

  const layer = catalog.layers.get(target);

  if (!layer) {
    const scaffolds = [...catalog.scaffolds.keys()].sort().join(', ');
    const layers = [...catalog.layers.keys()].sort().join(', ');
    throw new Error(
      `Unknown scaffold or layer "${target}".\n`
      + `  scaffolds: ${scaffolds}\n  layers: ${layers}`,
    );
  }

  return {
    id: layer.id,
    source: layer.source,
    value: {
      description: layer.value.description || layer.id,
      layers: [{ id: layer.id, when: undefined }],
      prompts: [],
      variables: {},
      files: [],
      actions: [],
    },
  };
}

async function readProjectVariables(
  destination: string,
): Promise<TemplateVariables> {
  const variables: Record<string, string> = {
    projectName: basename(destination),
    year: String(new Date().getFullYear()),
  };

  const manifestPath = join(destination, 'package.json');

  if (!await pathExists(manifestPath)) {
    variables.packageName = variables.projectName as string;
    return variables;
  }

  const manifest = await readJsonFile(manifestPath) as Record<string, unknown>;

  variables.packageName = typeof manifest.name === 'string'
    ? manifest.name
    : variables.projectName as string;
  variables.description = typeof manifest.description === 'string'
    ? manifest.description
    : '';
  variables.license = typeof manifest.license === 'string'
    ? manifest.license
    : 'UNLICENSED';

  return variables;
}

function canRunActions(
  entry: CatalogEntry<ProjectScaffold>,
  options: ApplyCommandOptions,
): boolean {
  if (options.actions === false || options.dryRun) {
    return false;
  }

  return entry.source.trusted || options.allowRemoteActions === true;
}

function report(
  label: string,
  files: readonly string[],
  color: (value: string) => string,
): void {
  for (const file of files) {
    console.log(`${color(label.padEnd(9))} ${file}`);
  }
}
