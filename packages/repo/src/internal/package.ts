import { readFileSync } from 'node:fs';

/**
 * Version of the currently executing `@your-org/repo` package.
 *
 * Reading package metadata at runtime avoids duplicating the version in source
 * code, so Changesets only needs to update `package.json`.
 */
export const PACKAGE_VERSION = readPackageVersion();

function readPackageVersion(): string {
  const packageJsonUrl = new URL('../../package.json', import.meta.url);
  const raw = JSON.parse(readFileSync(packageJsonUrl, 'utf8')) as unknown;

  if (
    typeof raw === 'object'
    && raw !== null
    && 'version' in raw
    && typeof raw.version === 'string'
  ) {
    return raw.version;
  }

  return '0.0.0';
}
