import { collectAnswers } from './answers.js';
import type { CatalogEntry } from './catalog.js';
import type { AnswerValue } from './prompt.js';
import type { ScaffoldLayer } from './schema.js';
import type { TemplateVariables } from './template.js';

/**
 * Answers stored per scope rather than in one flat bag.
 *
 * Two layers may each ask a question named `coverage` without one silently
 * overwriting the other, and a synchronization run can find exactly the answers
 * a given layer needs. Derived variables stay shared on purpose: a layer that
 * computes `tsconfigPreset` does so precisely so another layer's template can
 * read it.
 */
export interface ScopedAnswers {
  /**
   * Answers visible to every layer.
   *
   * Holds the scaffold's own prompts, base variables such as `projectName`,
   * and derived variables contributed by layers.
   */
  shared: Record<string, AnswerValue>;

  /** Prompt answers owned by one layer, keyed by layer ID. */
  layers: Record<string, Record<string, AnswerValue>>;
}

/** Options for resolving the answers a set of layers needs. */
export interface ResolveScopedAnswersOptions {
  /** Answers supplied ahead of time, keyed by question name. */
  presetAnswers?: Readonly<Record<string, string>>;
  /** Answers already recorded, keyed by layer ID then question name. */
  knownAnswers?: Readonly<Record<string, Readonly<Record<string, AnswerValue>>>>;
  /** Whether unanswered questions are asked instead of defaulted. */
  interactive?: boolean;
}

/**
 * Returns the variables one layer renders with.
 *
 * A layer sees the shared answers plus its own, so its templates keep using
 * plain names while its answers stay isolated from other layers.
 *
 * @param answers - Scoped answers.
 * @param layerId - Layer to build a scope for.
 * @returns Flat variables for rendering that layer.
 */
export function variablesForLayer(
  answers: ScopedAnswers,
  layerId: string,
): TemplateVariables {
  return { ...answers.shared, ...answers.layers[layerId] };
}

/**
 * Flattens scoped answers into a single variable map.
 *
 * Used for scaffold-level decisions - which layers apply, what actions run -
 * where no single layer owns the scope.
 *
 * @param answers - Scoped answers.
 * @returns Shared answers merged with every layer's answers.
 */
export function flattenAnswers(answers: ScopedAnswers): TemplateVariables {
  return Object.values(answers.layers).reduce<Record<string, AnswerValue>>(
    (merged, layerAnswers) => ({ ...merged, ...layerAnswers }),
    { ...answers.shared },
  );
}

/**
 * Asks each layer's own questions and records the answers per layer.
 *
 * Layers are processed in order so a later layer can depend on a derived
 * variable an earlier one contributed. A question that was already answered -
 * recorded from a previous run - is reused rather than asked again, and a
 * question added to a layer after the fact falls back to its default.
 *
 * @param layers - Layers to resolve answers for, in application order.
 * @param shared - Answers visible to every layer, used as the starting scope.
 * @param options - Preset answers, recorded answers, and interactivity.
 * @returns Scoped answers covering the shared scope and every layer.
 * @throws {Error} When a question cannot be answered.
 */
export async function resolveScopedAnswers(
  layers: readonly CatalogEntry<ScaffoldLayer>[],
  shared: Readonly<Record<string, AnswerValue>>,
  options: ResolveScopedAnswersOptions = {},
): Promise<ScopedAnswers> {
  const answers: ScopedAnswers = { shared: { ...shared }, layers: {} };

  for (const layer of layers) {
    const promptNames = layer.value.prompts.map((prompt) => prompt.name);
    const derivedNames = Object.keys(layer.value.variables);

    if (promptNames.length === 0 && derivedNames.length === 0) {
      continue;
    }

    const resolved = await collectAnswers(layer.value, {
      presetAnswers: options.presetAnswers ?? {},
      knownAnswers: options.knownAnswers?.[layer.id] ?? {},
      baseVariables: answers.shared,
      interactive: options.interactive ?? false,
    });

    if (promptNames.length > 0) {
      answers.layers[layer.id] = pick(resolved, promptNames);
    }

    // Derived variables are the layer's contribution to every other layer's
    // scope, so they are merged rather than scoped.
    Object.assign(answers.shared, pick(resolved, derivedNames));
  }

  return answers;
}

function pick(
  values: Readonly<Record<string, AnswerValue>>,
  names: readonly string[],
): Record<string, AnswerValue> {
  const picked: Record<string, AnswerValue> = {};

  for (const name of names) {
    const value = values[name];

    if (value !== undefined) {
      picked[name] = value;
    }
  }

  return picked;
}
