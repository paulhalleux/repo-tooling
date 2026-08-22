export {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
  CURRENT_LOCK_SCHEMA_VERSION,
  LOCK_FILE_NAME,
} from './constants.js';

export { RESOURCES_DIRECTORY } from './internal/resources.js';

export {
  parseRepositoryConfig,
  readRepositoryConfig,
  readRepositoryLock,
} from './internal/config.js';

export { planManagedFiles } from './internal/managed.js';

export {
  BUNDLED_SCAFFOLDS_DIRECTORY,
  REPOSITORY_SCAFFOLDS_DIRECTORY,
  resolveScaffoldSources,
} from './internal/scaffold-sources.js';

export {
  migrateRepositoryConfig,
} from './migrations/run.js';

export type {
  JsonPrimitive,
  JsonValue,
  RecordedAnswer,
  RepositoryConfig,
  RepositoryLock,
} from './types.js';

export type {
  RepositoryConfigMigration,
} from './migrations/types.js';
