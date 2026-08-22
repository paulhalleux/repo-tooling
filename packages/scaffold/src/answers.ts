import {
  type AnswerValue,
  askQuestion,
  defaultAnswer,
  skippedAnswer,
  validateAnswer,
} from './prompt.js';
import type { ScaffoldQuestion } from './schema.js';
import {
  evaluateCondition,
  renderTemplate,
  type TemplateVariables,
} from './template.js';

/** Options controlling how scaffold answers are collected. */
export interface CollectAnswersOptions {
  /**
   * Answers supplied ahead of time, keyed by question name.
   *
   * Matching questions are not asked. Values are parsed according to the
   * question type, so `--set tests=false` yields a boolean and
   * `--set features=docs,ci` yields an array.
   */
  presetAnswers?: Readonly<Record<string, string>>;

  /**
   * Answers already recorded for this project, keyed by question name.
   *
   * Used as-is - they were produced by an earlier run, so they need no parsing
   * - and consulted before prompting. This is what lets a project re-apply or
   * synchronize a layer without being asked the same questions again, or worse,
   * silently re-rendering it with a different default.
   */
  knownAnswers?: Readonly<Record<string, AnswerValue>>;

  /** Variables available to every question, such as `projectName`. */
  baseVariables?: TemplateVariables;

  /** Whether unanswered questions are asked instead of defaulted. */
  interactive?: boolean;
}

/** The questions and derived variables of a scaffold or a layer. */
export interface Questionnaire {
  prompts: readonly ScaffoldQuestion[];
  variables: Readonly<Record<string, string>>;
}

/**
 * Collects every variable declared by a scaffold or layer.
 *
 * Answers are resolved in precedence order: explicitly supplied answers, then
 * answers already recorded for the project, then a prompt or the default.
 * Questions are processed in order so later questions can depend on earlier
 * answers through their `when` condition and templated defaults. Derived
 * variables are rendered last, in declaration order.
 *
 * @param questionnaire - Prompts and derived variables to resolve.
 * @param options - Preset answers, base variables, and interactivity.
 * @returns Base variables extended with every collected answer.
 * @throws {Error} When a preset answer is invalid or a question cannot be
 *   answered non-interactively.
 */
export async function collectAnswers(
  questionnaire: Questionnaire,
  options: CollectAnswersOptions = {},
): Promise<Record<string, AnswerValue>> {
  const variables: Record<string, AnswerValue> = { ...options.baseVariables };
  const presets = options.presetAnswers ?? {};

  for (const question of questionnaire.prompts) {
    const preset = presets[question.name];

    if (preset !== undefined) {
      variables[question.name] = parsePresetAnswer(question, preset);
      continue;
    }

    const known = options.knownAnswers?.[question.name];

    if (known !== undefined) {
      variables[question.name] = known;
      continue;
    }

    const resolved = withRenderedDefault(question, variables);

    if (question.when && !evaluateCondition(question.when, variables)) {
      variables[question.name] = skippedAnswer(resolved);
      continue;
    }

    variables[question.name] = options.interactive
      ? await askQuestion(resolved)
      : defaultAnswer(resolved);
  }

  for (const [name, template] of Object.entries(questionnaire.variables)) {
    variables[name] = renderTemplate(template, variables);
  }

  return variables;
}

/**
 * Parses and validates an answer supplied outside of a prompt.
 *
 * @param question - Question the answer belongs to.
 * @param answer - Raw answer text, for example from `--set`.
 * @returns Parsed answer value.
 * @throws {Error} When the answer is not valid for the question.
 */
export function parsePresetAnswer(
  question: ScaffoldQuestion,
  answer: string,
): AnswerValue {
  if (question.type === 'confirm') {
    const normalized = answer.trim().toLowerCase();

    if (['true', 'yes', 'y', '1'].includes(normalized)) {
      return true;
    }

    if (['false', 'no', 'n', '0'].includes(normalized)) {
      return false;
    }

    throw new Error(
      `Answer for "${question.name}" must be a boolean, got "${answer}".`,
    );
  }

  if (question.type === 'multiselect') {
    const values = answer.split(',').map((value) => value.trim()).filter(Boolean);

    for (const value of values) {
      assertChoice(question.name, value, question.choices);
    }

    return values;
  }

  if (question.type === 'select') {
    assertChoice(question.name, answer, question.choices);
    return answer;
  }

  const message = validateAnswer(question, answer);

  if (message) {
    throw new Error(`Answer for "${question.name}" is invalid: ${message}`);
  }

  return answer;
}

function assertChoice(
  name: string,
  value: string,
  choices: readonly { value: string }[],
): void {
  if (choices.some((choice) => choice.value === value)) {
    return;
  }

  const values = choices.map((choice) => choice.value).join(', ');
  throw new Error(`Answer for "${name}" must be one of: ${values}.`);
}

function withRenderedDefault(
  question: ScaffoldQuestion,
  variables: TemplateVariables,
): ScaffoldQuestion {
  if (
    (question.type !== 'text' && question.type !== 'select')
    || question.default === undefined
  ) {
    return question;
  }

  return { ...question, default: renderTemplate(question.default, variables) };
}
