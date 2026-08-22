#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';

import { runAiListCommand } from './commands/ai.js';
import { runApplyCommand } from './commands/apply.js';
import { runCheckCommand } from './commands/check.js';
import { runCreateCommand } from './commands/create.js';
import { runInitCommand } from './commands/init.js';
import { runMigrateCommand } from './commands/migrate.js';
import { runSyncCommand } from './commands/sync.js';
import { PACKAGE_VERSION } from './internal/package.js';
import { findRepositoryRoot } from './internal/repository.js';

const program = new Command();

program
  .name('repo')
  .description(
    'Bootstrap, synchronize, validate, and migrate repository tooling.',
  )
  .version(PACKAGE_VERSION);

program
  .command('create')
  .description('Create a project from a scaffold.')
  .argument('[scaffold]', 'Scaffold ID, optionally followed by /<directory>.')
  .argument('[directory]', 'Directory to create.')
  .option('--package-name <name>', 'Shorthand for --set packageName=<name>.')
  .option(
    '--set <answer...>',
    'Pre-answer a scaffold question as <name>=<value>.',
  )
  .option(
    '-s, --source <source...>',
    'Extra scaffold source: a directory or a giget specification.',
  )
  .option('-y, --yes', 'Accept every default instead of asking.', false)
  .option('--no-actions', 'Skip post-create actions.')
  .option(
    '--allow-remote-actions',
    'Run actions declared by remote scaffold sources.',
    false,
  )
  .option('--dry-run', 'Report what would be created.', false)
  .option('-l, --list', 'List available scaffolds and layers.', false)
  .action(async (
    scaffold: string | undefined,
    directory: string | undefined,
    options: {
      packageName?: string;
      set?: string[];
      source?: string[];
      yes: boolean;
      actions: boolean;
      allowRemoteActions: boolean;
      dryRun: boolean;
      list: boolean;
    },
  ) => {
    await runCreateCommand(process.cwd(), {
      ...(scaffold ? { scaffold } : {}),
      ...(directory ? { directory } : {}),
      answers: {
        ...parseAnswers(options.set ?? []),
        ...(options.packageName
          ? { packageName: options.packageName }
          : {}),
      },
      sources: options.source ?? [],
      yes: options.yes,
      actions: options.actions,
      allowRemoteActions: options.allowRemoteActions,
      dryRun: options.dryRun,
      list: options.list,
    });
  });

program
  .command('apply')
  .description('Apply a scaffold or layer to an existing project.')
  .argument('<target>', 'Scaffold or layer ID.')
  .argument('[directory]', 'Project directory (defaults to the current one).')
  .option(
    '--set <answer...>',
    'Pre-answer a scaffold question as <name>=<value>.',
  )
  .option(
    '-s, --source <source...>',
    'Extra scaffold source: a directory or a giget specification.',
  )
  .option('-y, --yes', 'Accept every default instead of asking.', false)
  .option('-f, --force', 'Overwrite files that already differ.', false)
  .option('--no-actions', 'Skip post-apply actions.')
  .option(
    '--allow-remote-actions',
    'Run actions declared by remote scaffold sources.',
    false,
  )
  .option('--dry-run', 'Report what would change.', false)
  .action(async (
    target: string,
    directory: string | undefined,
    options: {
      set?: string[];
      source?: string[];
      yes: boolean;
      force: boolean;
      actions: boolean;
      allowRemoteActions: boolean;
      dryRun: boolean;
    },
  ) => {
    await runApplyCommand(process.cwd(), {
      target,
      ...(directory ? { directory } : {}),
      answers: parseAnswers(options.set ?? []),
      sources: options.source ?? [],
      yes: options.yes,
      force: options.force,
      actions: options.actions,
      allowRemoteActions: options.allowRemoteActions,
      dryRun: options.dryRun,
    });
  });

program
  .command('init')
  .description('Subscribe the repository to managed tooling layers.')
  .argument('[scaffold]', 'Tooling scaffold to subscribe to.')
  .option('-l, --layer <layers...>', 'Managed layers, replacing the scaffold.')
  .option(
    '--set <answer...>',
    'Pre-answer a scaffold or layer question as <name>=<value>.',
  )
  .option('--github-owner <owner>', 'GitHub organization or user.')
  .option('--repository-name <name>', 'GitHub repository name.')
  .option('-y, --yes', 'Accept every default instead of asking.', false)
  .option('-f, --force', 'Replace existing configuration/files.', false)
  .option('--no-sync', 'Create configuration without synchronizing files.')
  .option('--source <source...>', 'Extra catalog sources.')
  .action(async (scaffold: string | undefined, options: {
    layer?: string[];
    set?: string[];
    githubOwner?: string;
    repositoryName?: string;
    yes: boolean;
    force: boolean;
    sync: boolean;
    source?: string[];
  }) => {
    const root = await findRepositoryRoot(process.cwd());

    await runInitCommand(root, {
      ...(scaffold ? { scaffold } : {}),
      ...(options.layer ? { layers: options.layer } : {}),
      answers: parseAnswers(options.set ?? []),
      ...(options.githubOwner
        ? { githubOwner: options.githubOwner }
        : {}),
      ...(options.repositoryName
        ? { repositoryName: options.repositoryName }
        : {}),
      yes: options.yes,
      force: options.force,
      sync: options.sync,
      ...(options.source ? { sources: options.source } : {}),
    });
  });

program
  .command('sync')
  .description('Synchronize the managed layers the repository subscribes to.')
  .option('--check', 'Report drift without modifying files.', false)
  .option('-f, --force', 'Overwrite locally modified managed files.', false)
  .option('--source <source...>', 'Extra catalog sources.')
  .action(async (options: {
    check: boolean;
    force: boolean;
    source?: string[];
  }) => {
    const root = await findRepositoryRoot(process.cwd());

    await runSyncCommand(root, {
      check: options.check,
      force: options.force,
      ...(options.source ? { sources: options.source } : {}),
    });
  });

program
  .command('check')
  .description('Validate repository tooling configuration and managed files.')
  .action(async () => {
    const root = await findRepositoryRoot(process.cwd());
    await runCheckCommand(root);
  });


const aiCommand = program
  .command('ai')
  .description('Inspect project-scoped AI tooling from subscribed layers.');

aiCommand
  .command('list')
  .description('List the skills and agents the repository subscribes to.')
  .action(async () => {
    const root = await findRepositoryRoot(process.cwd());
    await runAiListCommand(root);
  });

program
  .command('migrate')
  .description('Migrate repository tooling configuration to the latest schema.')
  .action(async () => {
    const root = await findRepositoryRoot(process.cwd());
    await runMigrateCommand(root);
  });

function parseAnswers(entries: readonly string[]): Record<string, string> {
  const answers: Record<string, string> = {};

  for (const entry of entries) {
    const separatorIndex = entry.indexOf('=');

    if (separatorIndex <= 0) {
      throw new Error(
        `Invalid --set value "${entry}". Expected <name>=<value>.`,
      );
    }

    answers[entry.slice(0, separatorIndex)] = entry.slice(separatorIndex + 1);
  }

  return answers;
}

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${pc.red('error')} ${message}`);
  process.exitCode = 1;
}
