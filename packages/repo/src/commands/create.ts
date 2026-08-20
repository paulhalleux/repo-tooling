import { resolve } from 'node:path';

import pc from 'picocolors';
import validatePackageName from 'validate-npm-package-name';

import {
  createProjectFromScaffold,
  deriveProjectName,
  loadScaffoldCatalog,
  resolveScaffoldRequest,
} from '../internal/scaffold.js';

/** Options accepted by the `repo create` command. */
export interface CreateCommandOptions {
  /** Scaffold ID, optionally followed by the destination path. */
  scaffold?: string;
  /** Explicit destination path. */
  directory?: string;
  /** Package name written into rendered scaffold files. */
  packageName?: string;
  /** Print available scaffolds without creating a project. */
  list: boolean;
}

/** Creates a project from a bundled scaffold or lists available scaffolds. */
export async function runCreateCommand(
  currentDirectory: string,
  options: CreateCommandOptions,
): Promise<void> {
  const catalog = await loadScaffoldCatalog();

  if (options.list) {
    const scaffolds = Object.entries(catalog.scaffolds)
      .sort(([left], [right]) => left.localeCompare(right));

    for (const [id, scaffold] of scaffolds) {
      console.log(`${id.padEnd(20)} ${scaffold.description}`);
    }
    return;
  }

  if (!options.scaffold) {
    throw new Error(
      'Missing project scaffold. Run "repo create --list" to see available scaffolds.',
    );
  }

  const request = resolveScaffoldRequest(
    options.scaffold,
    options.directory,
    catalog,
  );
  const destination = resolve(currentDirectory, request.directory);
  const packageName = options.packageName ?? deriveProjectName(destination);
  assertValidPackageName(packageName);
  const scaffold = catalog.scaffolds[request.scaffoldId];

  if (!scaffold) {
    throw new Error(`Unknown project scaffold "${request.scaffoldId}".`);
  }

  const files = await createProjectFromScaffold(
    request.scaffoldId,
    scaffold,
    destination,
    { packageName },
  );

  console.log(
    `${pc.green('created')} ${request.scaffoldId} project in ${request.directory} (${files.length} files)`,
  );
  console.log(`next    cd ${request.directory} && pnpm install`);
}

function assertValidPackageName(packageName: string): void {
  const result = validatePackageName(packageName);

  if (result.validForNewPackages) {
    return;
  }

  const reasons = [...(result.errors ?? []), ...(result.warnings ?? [])];
  throw new Error(
    `Invalid package name ${JSON.stringify(packageName)}: `
    + `${reasons.join('; ')}.`,
  );
}
