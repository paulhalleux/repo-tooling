import { fileURLToPath } from 'node:url';

/** Absolute path to the CLI package's canonical resource root. */
export const RESOURCES_DIRECTORY = fileURLToPath(
  new URL('../../resources/', import.meta.url),
);
