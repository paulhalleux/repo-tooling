import Handlebars from 'handlebars';
import { camelCase, kebabCase, pascalCase, snakeCase, titleCase } from 'scule';

const runtime = Handlebars.create();

runtime.registerHelper('eq', (left: unknown, right: unknown) => left === right);
runtime.registerHelper('ne', (left: unknown, right: unknown) => left !== right);
runtime.registerHelper('not', (value: unknown) => !value);
runtime.registerHelper(
  'includes',
  (list: unknown, value: unknown) => Array.isArray(list) && list.includes(value),
);
runtime.registerHelper('json', (value: unknown) => JSON.stringify(value));
runtime.registerHelper('kebab', (value: unknown) => kebabCase(String(value)));
runtime.registerHelper('camel', (value: unknown) => camelCase(String(value)));
runtime.registerHelper('pascal', (value: unknown) => pascalCase(String(value)));
runtime.registerHelper('snake', (value: unknown) => snakeCase(String(value)));
runtime.registerHelper('title', (value: unknown) => titleCase(String(value)));

const COMPILE_OPTIONS: CompileOptions = { strict: true, noEscape: true };

/**
 * A value a template may reference.
 *
 * Confirm answers stay real booleans and multiselect answers stay arrays so
 * `{{#if}}` and `{{#each}}` behave as expected.
 */
export type TemplateValue = string | boolean | string[];

/** Every value available while rendering a template. */
export type TemplateVariables = Readonly<Record<string, TemplateValue>>;

/**
 * Renders a template.
 *
 * Templates are Handlebars templates compiled in strict mode: every referenced
 * variable must exist, so a typo fails fast instead of producing a partially
 * rendered project file. HTML escaping is disabled because rendered files are
 * source code, not markup.
 *
 * Besides the Handlebars built-ins, these helpers are available: `eq`, `ne`,
 * `not`, `includes`, `json`, and the `kebab`, `camel`, `pascal`, `snake`, and
 * `title` case converters.
 *
 * @param template - Raw template content.
 * @param variables - Available template variables.
 * @returns Fully rendered content.
 * @throws {Error} When the template is malformed or a variable is missing.
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  return runtime.compile(template, COMPILE_OPTIONS)(variables);
}

/**
 * Evaluates a Handlebars expression as a boolean condition.
 *
 * The expression is the inside of an `{{#if}}` block, so plain variable
 * references (`tests`) and helper sub-expressions (`(eq license "MIT")`,
 * `(includes features "docs")`) both work.
 *
 * @param condition - Handlebars condition expression.
 * @param variables - Available template variables.
 * @returns Whether the condition holds.
 * @throws {Error} When the expression or a referenced variable is invalid.
 */
export function evaluateCondition(
  condition: string,
  variables: TemplateVariables,
): boolean {
  return renderTemplate(`{{#if ${condition}}}true{{/if}}`, variables) === 'true';
}
