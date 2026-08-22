import type { ManagedFileState } from '@paulhalleux/scaffold';

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
 * An answer recorded for a scaffold question.
 */
export type RecordedAnswer = string | boolean | string[];

/**
 * Recorded answers grouped by scope.
 */
export interface RecordedAnswers {
  /**
   * Answers visible to every layer, such as `githubOwner`.
   */
  shared: Record<string, RecordedAnswer>;

  /**
   * Prompt answers owned by one layer, keyed by layer ID.
   */
  layers: Record<string, Record<string, RecordedAnswer>>;
}

/**
 * Configuration stored in `.repo-tooling.json`.
 *
 * The configuration records what the repository subscribes to - which managed
 * layers it wants kept current, and the answers those layers render with - so
 * `repo sync` can re-materialize them later without asking again. Generated
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
   * Ordered managed layers the repository subscribes to.
   *
   * Later layers win when two layers write the same file. Layers are resolved
   * against the same catalog `repo create` uses, so repository tooling and
   * project scaffolding share one composition model.
   */
  layers: string[];

  /**
   * Answers used to render subscribed layers, grouped by scope.
   *
   * Recorded when the repository is initialized, and reused by every later
   * synchronization so managed files stay reproducible. Grouping keeps each
   * layer's answers findable and stops two layers that ask a question of the
   * same name from overwriting one another.
   */
  answers: RecordedAnswers;
}

/**
 * Generated state stored in `.repo-tooling.lock.json`.
 *
 * The lock file distinguishes tool-owned files from project-owned or manually
 * modified files. Unknown files are never considered managed.
 */
export interface RepositoryLock {
  /**
   * Lock file schema version.
   */
  schemaVersion: number;

  /**
   * Managed files keyed by repository-relative destination path.
   */
  files: Record<string, ManagedFileState>;
}
