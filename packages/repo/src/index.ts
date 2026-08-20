export {
  CONFIG_FILE_NAME,
  CURRENT_CONFIG_SCHEMA_VERSION,
  CURRENT_LOCK_SCHEMA_VERSION,
  LOCK_FILE_NAME,
} from './constants.js';

export {
  loadProfileCatalog,
  resolveManagedFiles,
} from './internal/catalog.js';

export {
  parseRepositoryConfig,
  readRepositoryConfig,
  readRepositoryLock,
} from './internal/config.js';

export {
  normalizeRelativePath,
  synchronizeRepository,
} from './internal/sync.js';

export {
  migrateRepositoryConfig,
} from './migrations/run.js';

export type {
  JsonPrimitive,
  JsonValue,
  ManagedFileDefinition,
  ManagedFileLockEntry,
  RepositoryConfig,
  RepositoryLock,
  RepositoryProfile,
  RepositoryProfileCatalog,
  SyncResult,
} from './types.js';

export type {
  SynchronizeRepositoryOptions,
} from './internal/sync.js';

export type {
  RepositoryConfigMigration,
} from './migrations/types.js';
