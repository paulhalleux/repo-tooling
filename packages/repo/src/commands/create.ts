import { basename, resolve } from 'node:path';

import {
  askQuestion,
  type CatalogEntry,
  isInteractive,
  type ProjectScaffold,
  prepareProject,
  requireScaffold,
  type ResolvedCatalog,
  runActions,
  writePlan,
} from '@paulhalleux/scaffold';
import { intro, log, note, outro } from '@clack/prompts';
import pc from 'picocolors';

import { resolveScaffoldSources } from '../internal/scaffold-sources.js';
import { subscribeManagedLayers } from '../internal/subscribe.js';

/** Options accepted by the `repo create` command. */
export interface CreateCommandOptions {
  /** Scaffold ID, optionally followed by `/<directory>`. */
  scaffold?: string;
  /** Explicit destination path. */
  directory?: string;
  /** Pre-supplied answers keyed by question name. */
  answers?: Record<string, string>;
  /** Extra scaffold sources: local paths or `giget` specifications. */
  sources?: string[];
  /** Accept every default instead of asking questions. */
  yes?: boolean;
  /** Run post-create actions. */
  actions?: boolean;
  /** Allow actions declared by untrusted (remote) sources to run. */
  allowRemoteActions?: boolean;
  /** Report what would be created without writing anything. */
  dryRun?: boolean;
  /** Print available scaffolds without creating a project. */
  list: boolean;
}

/** Creates a project from a scaffold, or lists the available scaffolds. */
export async function runCreateCommand(
  currentDirectory: string,
  options: CreateCommandOptions,
): Promise<void> {
  const { catalog } = await resolveScaffoldSources(
    currentDirectory,
    options.sources ?? [],
  );

  if (options.list) {
    listCatalog(catalog);
    return;
  }

  const interactive = isInteractive() && options.yes !== true;

  if (interactive) {
    intro(pc.bgCyan(pc.black(' repo create ')));
  }

  const request = await resolveRequest(catalog, options, interactive);
  const entry = requireScaffold(catalog, request.scaffoldId);
  const destination = resolve(currentDirectory, request.directory);

  const project = await prepareProject(entry, catalog, {
    presetAnswers: options.answers ?? {},
    baseVariables: {
      projectName: basename(destination),
      year: String(new Date().getFullYear()),
    },
    interactive,
  });

  const result = await writePlan(project.files, {
    destination,
    mode: 'create',
    ...(options.dryRun ? { dryRun: true } : {}),
  });

  const summary = `${request.scaffoldId} in ${request.directory} `
    + `(${result.created.length} files)`;

  if (interactive) {
    log.success(`${options.dryRun ? 'Planned' : 'Created'} ${summary}`);
  } else {
    console.log(
      `${pc.green(options.dryRun ? 'planned' : 'created')} ${summary}`,
    );
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

  const actions = await runActions(project.actions, {
    cwd: destination,
    variables: project.variables,
    execute: canRunActions(entry, options),
    ...(interactive ? { onStep: (label) => log.step(label) } : {}),
  });

  for (const failure of actions.failed) {
    console.warn(`${pc.yellow('warn')} action failed: ${failure}`);
  }

  const messages = [
    `cd ${request.directory}`,
    ...actions.messages.length > 0 || actions.completed.length > 0
      ? actions.messages
      : ['pnpm install'],
  ];

  if (interactive) {
    note(messages.join('\n'), 'next');
    outro('Done.');
    return;
  }

  for (const message of messages) {
    console.log(`next    ${message}`);
  }
}

function canRunActions(
  entry: CatalogEntry<ProjectScaffold>,
  options: CreateCommandOptions,
): boolean {
  if (options.actions === false || options.dryRun) {
    return false;
  }

  if (entry.source.trusted) {
    return true;
  }

  if (options.allowRemoteActions) {
    return true;
  }

  console.warn(
    `${pc.yellow('warn')} skipped actions from untrusted source `
    + `"${entry.source.origin}". Pass --allow-remote-actions to run them.`,
  );
  return false;
}

function listCatalog(catalog: ResolvedCatalog): void {
  const scaffolds = [...catalog.scaffolds.values()]
    .sort((left, right) => left.id.localeCompare(right.id));

  for (const entry of scaffolds) {
    const origin = entry.source.origin === 'bundled'
      ? ''
      : pc.dim(` [${entry.source.origin}]`);
    console.log(`${entry.id.padEnd(20)} ${entry.value.description}${origin}`);
  }

  const layers = [...catalog.layers.values()]
    .sort((left, right) => left.id.localeCompare(right.id));

  if (layers.length === 0) {
    return;
  }

  console.log(`\n${pc.dim('layers (usable with "repo apply")')}`);

  for (const layer of layers) {
    console.log(`${layer.id.padEnd(20)} ${layer.value.description}`);
  }
}

async function resolveRequest(
  catalog: ResolvedCatalog,
  options: CreateCommandOptions,
  interactive: boolean,
): Promise<{ scaffoldId: string; directory: string }> {
  const scaffoldId = options.scaffold
    ?? await askScaffoldId(catalog, interactive);

  if (options.directory) {
    return { scaffoldId, directory: options.directory };
  }

  if (catalog.scaffolds.has(scaffoldId)) {
    return {
      scaffoldId,
      directory: await askDirectory(scaffoldId, interactive),
    };
  }

  const combined = [...catalog.scaffolds.keys()]
    .sort((left, right) => right.length - left.length)
    .find((id) => scaffoldId.startsWith(`${id}/`));

  if (!combined) {
    requireScaffold(catalog, scaffoldId);
  }

  return {
    scaffoldId: combined as string,
    directory: scaffoldId.slice((combined as string).length + 1),
  };
}

async function askScaffoldId(
  catalog: ResolvedCatalog,
  interactive: boolean,
): Promise<string> {
  if (!interactive) {
    throw new Error(
      'Missing project scaffold. Run "repo create --list" to see available scaffolds.',
    );
  }

  return String(await askQuestion({
    type: 'select',
    name: 'scaffold',
    message: 'Project scaffold',
    choices: [...catalog.scaffolds.values()]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((entry) => ({
        value: entry.id,
        description: entry.value.description,
      })),
  }));
}

async function askDirectory(
  scaffoldId: string,
  interactive: boolean,
): Promise<string> {
  if (!interactive) {
    throw new Error(
      `Missing project directory. Run "repo create ${scaffoldId} <directory>".`,
    );
  }

  return String(await askQuestion({
    type: 'text',
    name: 'directory',
    message: 'Project directory',
    validate: { rule: 'relative-path' },
  }));
}
