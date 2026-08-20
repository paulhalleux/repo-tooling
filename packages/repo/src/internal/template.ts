const VARIABLE_PATTERN = /\{\{([A-Za-z][A-Za-z0-9_.-]*)\}\}/g;

/**
 * Renders a managed text template.
 *
 * Every variable reference must be present in the supplied variable map.
 * Unknown variables fail fast to prevent partially rendered repository files.
 *
 * @param template - Raw template content.
 * @param variables - Available template variables.
 * @returns Fully rendered content.
 * @throws {Error} When a referenced variable is missing.
 */
export function renderTemplate(
  template: string,
  variables: Readonly<Record<string, string>>,
): string {
  return template.replace(
    VARIABLE_PATTERN,
    (_match: string, variableName: string) => {
      const value = variables[variableName];

      if (value === undefined) {
        throw new Error(
          `Template references undefined variable "${variableName}".`,
        );
      }

      return value;
    },
  );
}
