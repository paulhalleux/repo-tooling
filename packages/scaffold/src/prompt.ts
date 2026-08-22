import {
  cancel,
  confirm,
  isCancel,
  isCI,
  isTTY,
  multiselect,
  select,
  text,
} from '@clack/prompts';
import validateNpmPackageName from 'validate-npm-package-name';

import type { ScaffoldQuestion } from './schema.js';
import type { TemplateValue } from './template.js';

/** Value produced by answering a question. */
export type AnswerValue = TemplateValue;

/**
 * Asks a single question on the terminal.
 *
 * Answers are returned as template values: confirm questions produce a boolean,
 * multiselect questions an array, and everything else a string.
 *
 * @param question - Question definition.
 * @returns Answer value.
 * @throws {Error} When the user cancels the prompt.
 */
export async function askQuestion(
  question: ScaffoldQuestion,
): Promise<AnswerValue> {
  if (question.type === 'confirm') {
    return unwrap(await confirm({
      message: question.message,
      initialValue: question.default !== false,
    }));
  }

  if (question.type === 'select') {
    return unwrap(await select({
      message: question.message,
      options: question.choices.map(toOption),
      ...(question.default === undefined
        ? {}
        : { initialValue: question.default }),
    }));
  }

  if (question.type === 'multiselect') {
    return unwrap(await multiselect({
      message: question.message,
      options: question.choices.map(toOption),
      initialValues: question.default ?? [],
      required: question.optional !== true,
    }));
  }

  return unwrap(await text({
    message: question.message,
    ...(question.default === undefined
      ? {}
      : { placeholder: question.default, defaultValue: question.default }),
    validate: (value) => validateAnswer(question, value ?? '') ?? undefined,
  })) ?? question.default ?? '';
}

/**
 * Validates a text answer against the question's declared rules.
 *
 * @param question - Question definition.
 * @param value - Candidate answer.
 * @returns An error message, or `undefined` when the answer is acceptable.
 */
export function validateAnswer(
  question: ScaffoldQuestion,
  value: string,
): string | undefined {
  if (question.type !== 'text') {
    return undefined;
  }

  if (!value) {
    return question.optional || question.default !== undefined
      ? undefined
      : 'An answer is required.';
  }

  const rules = question.validate;

  if (!rules) {
    return undefined;
  }

  if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
    return rules.message ?? `Must match ${rules.pattern}.`;
  }

  const ruleMessage = applyBuiltInRule(rules.rule, value);
  return ruleMessage ? rules.message ?? ruleMessage : undefined;
}

/**
 * Reports whether the process can ask interactive questions.
 *
 * @returns `true` when a terminal is attached and the process is not CI.
 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY) && isTTY(process.stdout) && !isCI();
}

/**
 * Returns the answer a question falls back to without user input.
 *
 * @param question - Question definition.
 * @returns Default answer value.
 * @throws {Error} When the question has no usable default.
 */
export function defaultAnswer(question: ScaffoldQuestion): AnswerValue {
  if (question.type === 'confirm') {
    return question.default !== false;
  }

  if (question.type === 'multiselect') {
    return question.default ?? [];
  }

  if (question.type === 'select') {
    const choice = question.choices
      .find((candidate) => candidate.value === question.default)
      ?? question.choices[0];

    if (!choice) {
      throw new Error(`Question "${question.name}" has no choices.`);
    }

    return choice.value;
  }

  if (question.default !== undefined) {
    return question.default;
  }

  if (question.optional) {
    return '';
  }

  throw new Error(
    `Question "${question.name}" requires an answer. `
    + `Provide it with --set ${question.name}=<value>.`,
  );
}

/**
 * Returns the value used when a question is skipped by its `when` condition.
 *
 * Skipped questions resolve to a neutral value rather than their default so a
 * gated feature stays off, for example a publishing question that only applies
 * to licensed packages.
 *
 * @param question - Question definition.
 * @returns Neutral answer value.
 */
export function skippedAnswer(question: ScaffoldQuestion): AnswerValue {
  if (question.type === 'confirm') {
    return false;
  }

  if (question.type === 'multiselect') {
    return [];
  }

  if (question.type === 'select') {
    return defaultAnswer(question);
  }

  return question.default ?? '';
}

function applyBuiltInRule(
  rule: 'npm-package-name' | 'relative-path' | 'semver' | undefined,
  value: string,
): string | undefined {
  if (rule === 'npm-package-name') {
    const result = validateNpmPackageName(value);

    return result.validForNewPackages
      ? undefined
      : [...result.errors ?? [], ...result.warnings ?? []].join('; ');
  }

  if (rule === 'relative-path') {
    return value.startsWith('/') || value.split('/').includes('..')
      ? 'Must be a relative path.'
      : undefined;
  }

  if (rule === 'semver') {
    return /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(value)
      ? undefined
      : 'Must be a semantic version, for example 1.0.0.';
  }

  return undefined;
}

function toOption(
  choice: { value: string; label?: string | undefined; description?: string | undefined },
): { value: string; label: string; hint?: string } {
  return {
    value: choice.value,
    label: choice.label ?? choice.value,
    ...(choice.description ? { hint: choice.description } : {}),
  };
}

function unwrap<T>(value: T | symbol): T {
  if (isCancel(value)) {
    cancel('Cancelled.');
    throw new Error('Cancelled.');
  }

  return value as T;
}
