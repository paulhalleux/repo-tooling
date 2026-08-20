/**
 * JSON-compatible primitive value.
 */
export type JsonPrimitive = string | number | boolean | null;

/**
 * JSON-compatible value.
 */
export type JsonValue =
  | JsonPrimitive
  | JsonValue[]
  | { [key: string]: JsonValue };

/**
 * Configuration stored in `.repo-tooling.json`.
 *
 * The configuration intentionally contains only project choices. Generated
 * state belongs in `.repo-tooling.lock.json`.
 */
export interface RepositoryConfig {
  /**
   * Configuration schema version.
   *
   * This value is migrated by `repo migrate` when the CLI introduces a
   * backwards-incompatible configuration shape.
   */
  schemaVersion: number;

  /**
   * Ordered profiles applied to the repository.
   *
   * Later profiles may override managed files declared by earlier profiles.
   */
  profiles: string[];

  /**
   * Variables made available to managed text templates.
   *
   * Template references use `{{variableName}}`.
   */
  variables: Record<string, string>;
}

/**
 * A managed file declared by a repository tooling profile.
 */
export interface ManagedFileDefinition {
  /**
   * File path relative to the CLI package's `templates` directory.
   */
  source: string;

  /**
   * Destination path relative to the consumer repository root.
   */
  target: string;
}

/**
 * A reusable repository profile.
 */
export interface RepositoryProfile {
  /**
   * Optional profiles that are applied before this profile.
   */
  extends?: string[];

  /**
   * Managed files contributed by the profile.
   */
  files?: ManagedFileDefinition[];
}

/**
 * Catalog of all repository profiles shipped by the CLI package.
 */
export interface RepositoryProfileCatalog {
  /**
   * Profile definitions keyed by profile name.
   */
  profiles: Record<string, RepositoryProfile>;
}

/**
 * State recorded for one CLI-managed file.
 */
export interface ManagedFileLockEntry {
  /**
   * SHA-256 hash of the exact file content last written by the CLI.
   */
  hash: string;

  /**
   * Template source used to generate the file.
   */
  source: string;
}

/**
 * Generated state stored in `.repo-tooling.lock.json`.
 *
 * The lock file is used to distinguish CLI-owned files from project-owned or
 * manually modified files. Unknown files are never considered managed.
 */
export interface RepositoryLock {
  /**
   * Lock file schema version.
   */
  schemaVersion: 1;

  /**
   * Managed files keyed by repository-relative destination path.
   */
  files: Record<string, ManagedFileLockEntry>;
}

/**
 * Result of a repository synchronization operation.
 */
export interface SyncResult {
  /**
   * Files created or updated successfully.
   */
  changed: string[];

  /**
   * Previously managed files removed because they are no longer declared.
   */
  removed: string[];

  /**
   * Files that differ from the desired state when running in check mode.
   */
  drifted: string[];

  /**
   * Files that could not safely be changed because their current content no
   * longer matches the last CLI-managed hash.
   */
  conflicts: string[];
}
