#!/usr/bin/env node

import { Command } from 'commander';
import pc from 'picocolors';

import { runCheckCommand } from './commands/check.js';
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
  .command('init')
  .description('Initialize repository tooling configuration.')
  .option(
    '-p, --profile <profiles...>',
    'Ordered repository profiles.',
    ['typescript-library'],
  )
  .option('--github-owner <owner>', 'GitHub organization or user.')
  .option('--repository-name <name>', 'GitHub repository name.')
  .option('-f, --force', 'Replace existing configuration/files.', false)
  .option('--no-sync', 'Create configuration without synchronizing files.')
  .action(async (options: {
    profile: string[];
    githubOwner?: string;
    repositoryName?: string;
    force: boolean;
    sync: boolean;
  }) => {
    const root = await findRepositoryRoot(process.cwd());

    await runInitCommand(root, {
      profiles: options.profile,
      ...(options.githubOwner
        ? { githubOwner: options.githubOwner }
        : {}),
      ...(options.repositoryName
        ? { repositoryName: options.repositoryName }
        : {}),
      force: options.force,
      sync: options.sync,
    });
  });

program
  .command('sync')
  .description('Synchronize CLI-managed repository files.')
  .option('--check', 'Report drift without modifying files.', false)
  .option('-f, --force', 'Overwrite locally modified managed files.', false)
  .action(async (options: { check: boolean; force: boolean }) => {
    const root = await findRepositoryRoot(process.cwd());

    await runSyncCommand(root, options);
  });

program
  .command('check')
  .description('Validate repository tooling configuration and managed files.')
  .action(async () => {
    const root = await findRepositoryRoot(process.cwd());
    await runCheckCommand(root);
  });

program
  .command('migrate')
  .description('Migrate repository tooling configuration to the latest schema.')
  .action(async () => {
    const root = await findRepositoryRoot(process.cwd());
    await runMigrateCommand(root);
  });

try {
  await program.parseAsync(process.argv);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${pc.red('error')} ${message}`);
  process.exitCode = 1;
}
