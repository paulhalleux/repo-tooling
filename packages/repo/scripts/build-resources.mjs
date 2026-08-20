import { cp, mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const packageDirectory = resolve(scriptDirectory, '..');
const repositoryRoot = resolve(packageDirectory, '../..');
const resourcesDirectory = join(packageDirectory, 'resources');

await rm(resourcesDirectory, { recursive: true, force: true });
await mkdir(resourcesDirectory, { recursive: true });

for (const directory of ['ai', 'profiles', 'scaffolds', 'templates']) {
  await cp(
    join(repositoryRoot, directory),
    join(resourcesDirectory, directory),
    { recursive: true },
  );
}
