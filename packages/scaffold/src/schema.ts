import { z } from 'zod';

const identifier = z.string().regex(
  /^[a-z0-9]+(?:[/-][a-z0-9]+)*$/,
  'must be a lowercase, slash- or dash-delimited identifier.',
);

const variableName = z.string().regex(
  /^[A-Za-z][A-Za-z0-9_]*$/,
  'must be a valid variable name.',
);

const relativePath = z.string()
  .min(1)
  .refine(
    (value) => !value.startsWith('/') && !value.split('/').includes('..'),
    'must be a relative path that stays inside the scaffold.',
  );

/** A Handlebars expression evaluated as a boolean. */
const condition = z.string().min(1);

const choiceSchema = z.object({
  value: z.string(),
  label: z.string().optional(),
  description: z.string().optional(),
});

const validationSchema = z.object({
  /** Regular expression the answer must match. */
  pattern: z.string().optional(),
  /** Message shown when validation fails. */
  message: z.string().optional(),
  /** Built-in validators applied in addition to `pattern`. */
  rule: z.enum(['npm-package-name', 'relative-path', 'semver']).optional(),
});

const questionBase = {
  name: variableName,
  message: z.string().min(1),
  /** Condition gating the question; skipped questions use a neutral value. */
  when: condition.optional(),
  /** Extra explanation rendered next to the question. */
  hint: z.string().optional(),
};

const questionSchema = z.discriminatedUnion('type', [
  z.object({
    ...questionBase,
    type: z.literal('text'),
    default: z.string().optional(),
    optional: z.boolean().optional(),
    validate: validationSchema.optional(),
  }),
  z.object({
    ...questionBase,
    type: z.literal('confirm'),
    default: z.boolean().optional(),
  }),
  z.object({
    ...questionBase,
    type: z.literal('select'),
    choices: z.array(choiceSchema).min(1),
    default: z.string().optional(),
  }),
  z.object({
    ...questionBase,
    type: z.literal('multiselect'),
    choices: z.array(choiceSchema).min(1),
    default: z.array(z.string()).optional(),
    /** Whether an empty selection is accepted. */
    optional: z.boolean().optional(),
  }),
]);

const fileRuleSchema = z.object({
  /** Glob matched against the target path, for example `src/**\/*.test.ts`. */
  path: z.string().min(1),
  /** Condition deciding whether matching files are materialized. */
  when: condition,
});

const layerReferenceSchema = z.union([
  identifier.transform((id) => ({ id, when: undefined })),
  z.object({ id: identifier, when: condition.optional() }),
]);

const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('git-init'),
    when: condition.optional(),
    /** Commit message for the initial commit; omit to skip committing. */
    commit: z.string().optional(),
  }),
  z.object({
    type: z.literal('run'),
    when: condition.optional(),
    command: z.string().min(1),
    args: z.array(z.string()).default([]),
    /** Human-readable label shown while the command runs. */
    label: z.string().optional(),
    /** Whether a non-zero exit code fails project creation. */
    required: z.boolean().default(false),
  }),
  z.object({
    type: z.literal('message'),
    when: condition.optional(),
    /** Rendered as a template and printed after creation. */
    text: z.string().min(1),
  }),
]);

/** A reusable set of files contributed to a scaffold. */
export const layerSchema = z.object({
  /** Directory below the catalog root holding the layer's files. */
  source: relativePath,
  /**
   * Directory below the project root the layer's files are written to.
   *
   * Defaults to the project root. A layer shipping editor or agent resources
   * can point at `.agents/skills` without mirroring that path on disk.
   */
  target: relativePath.optional(),
  /**
   * Whether the layer's files stay owned by the tool after they are written.
   *
   * Managed layers are recorded in a lock file and kept up to date by
   * `syncPlan`; unmanaged layers are handed over to the project on write and
   * never touched again.
   */
  managed: z.boolean().default(false),
  /** Short description shown by `repo create --list`. */
  description: z.string().default(''),
  /** Questions asked only when this layer is part of the project. */
  prompts: z.array(questionSchema).default([]),
  /** Variables derived from answers, rendered as templates in order. */
  variables: z.record(variableName, z.string()).default({}),
  /** Conditional file rules applied to this layer's files. */
  files: z.array(fileRuleSchema).default([]),
  /** Steps executed after the files are written. */
  actions: z.array(actionSchema).default([]),
});

/** A project scaffold composed from one or more layers. */
export const scaffoldSchema = z.object({
  description: z.string().min(1),
  /** Ordered layers; later layers win when targets collide. */
  layers: z.array(layerReferenceSchema).min(1),
  /** Questions asked before the project is created. */
  prompts: z.array(questionSchema).default([]),
  /** Variables derived from answers, rendered as templates in order. */
  variables: z.record(variableName, z.string()).default({}),
  /** Conditional file rules applied to the composed file set. */
  files: z.array(fileRuleSchema).default([]),
  /** Steps executed after the files are written. */
  actions: z.array(actionSchema).default([]),
});

/** The contents of a scaffold catalog file. */
export const catalogSchema = z.object({
  layers: z.record(identifier, layerSchema).default({}),
  scaffolds: z.record(identifier, scaffoldSchema).default({}),
});

/** A reusable set of files contributed to a scaffold. */
export type ScaffoldLayer = z.infer<typeof layerSchema>;

/** A project scaffold composed from one or more layers. */
export type ProjectScaffold = z.infer<typeof scaffoldSchema>;

/** A question asked while creating a project. */
export type ScaffoldQuestion = z.infer<typeof questionSchema>;

/** One selectable option of a select or multiselect question. */
export type ScaffoldChoice = z.infer<typeof choiceSchema>;

/** A rule deciding whether matching files are materialized. */
export type ScaffoldFileRule = z.infer<typeof fileRuleSchema>;

/** A step executed after a project's files are written. */
export type ScaffoldAction = z.infer<typeof actionSchema>;

/** Parsed contents of one scaffold catalog. */
export type ScaffoldCatalog = z.infer<typeof catalogSchema>;

/**
 * Parses and validates a scaffold catalog.
 *
 * @param value - Raw parsed JSON contents of a catalog file.
 * @param origin - Human-readable catalog location used in error messages.
 * @returns Validated catalog.
 * @throws {Error} When the catalog does not match the schema.
 */
export function parseCatalog(value: unknown, origin: string): ScaffoldCatalog {
  const result = catalogSchema.safeParse(value);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  ${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid scaffold catalog at ${origin}:\n${issues}`);
  }

  return result.data;
}
