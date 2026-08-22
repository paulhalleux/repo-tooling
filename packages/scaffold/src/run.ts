import { collectAnswers } from './answers.js';
import type { CatalogEntry, ResolvedCatalog } from './catalog.js';
import { planProject, type PlannedFile, resolveLayers } from './plan.js';
import type { AnswerValue } from './prompt.js';
import {
  flattenAnswers,
  resolveScopedAnswers,
  type ScopedAnswers,
} from './scope.js';
import type {
  ProjectScaffold,
  ScaffoldAction,
  ScaffoldLayer,
} from './schema.js';
import type { TemplateVariables } from './template.js';

/** Options for preparing a project from a scaffold. */
export interface PrepareProjectOptions {
  /** Answers supplied ahead of time, keyed by question name. */
  presetAnswers?: Readonly<Record<string, string>>;
  /** Shared answers already recorded for the project, used before prompting. */
  knownAnswers?: Readonly<Record<string, AnswerValue>>;
  /** Recorded layer answers, keyed by layer ID then question name. */
  knownLayerAnswers?: Readonly<
    Record<string, Readonly<Record<string, AnswerValue>>>
  >;
  /** Variables available to every question, such as `projectName`. */
  baseVariables?: TemplateVariables;
  /** Whether unanswered questions are asked instead of defaulted. */
  interactive?: boolean;
}

/** Everything needed to write a project and finish it off. */
export interface PreparedProject {
  /** Answers grouped by scope, ready to be recorded. */
  answers: ScopedAnswers;
  /** Every answer flattened, for actions and scaffold-level decisions. */
  variables: Record<string, AnswerValue>;
  /** Layers included for these answers, in application order. */
  layers: CatalogEntry<ScaffoldLayer>[];
  /** Files to write. */
  files: PlannedFile[];
  /** Scaffold and layer actions to run after writing, in order. */
  actions: ScaffoldAction[];
}

/**
 * Asks every question a scaffold needs and composes the resulting file set.
 *
 * Questions are collected in two phases: the scaffold's own prompts decide
 * which layers apply, then each included layer contributes its own prompts.
 * That keeps a layer self-contained - a testing layer owns its questions - and
 * still lets the scaffold drive which layers exist at all.
 *
 * Answers come back grouped by scope, so two layers can ask a question of the
 * same name without colliding.
 *
 * @param entry - Scaffold to prepare.
 * @param catalog - Merged catalog used to resolve layer references.
 * @param options - Preset answers, base variables, and interactivity.
 * @returns Variables, layers, planned files, and pending actions.
 * @throws {Error} When a question cannot be answered or a template fails.
 */
export async function prepareProject(
  entry: CatalogEntry<ProjectScaffold>,
  catalog: ResolvedCatalog,
  options: PrepareProjectOptions = {},
): Promise<PreparedProject> {
  const shared = await collectAnswers(entry.value, {
    ...options,
    baseVariables: options.baseVariables ?? {},
  });

  const layers = resolveLayers(entry, catalog, shared);
  const answers = await resolveScopedAnswers(layers, shared, {
    ...(options.presetAnswers ? { presetAnswers: options.presetAnswers } : {}),
    ...(options.knownLayerAnswers
      ? { knownAnswers: options.knownLayerAnswers }
      : {}),
    ...(options.interactive === undefined
      ? {}
      : { interactive: options.interactive }),
  });

  const files = await planProject(entry, layers, answers);
  const actions = [
    ...layers.flatMap((layer) => layer.value.actions),
    ...entry.value.actions,
  ];

  return {
    answers,
    variables: flattenAnswers(answers) as Record<string, AnswerValue>,
    layers,
    files,
    actions,
  };
}
