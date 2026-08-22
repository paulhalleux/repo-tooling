import { x } from 'tinyexec';

import type { ScaffoldAction } from './schema.js';
import {
  evaluateCondition,
  renderTemplate,
  type TemplateVariables,
} from './template.js';

/** Options controlling post-create action execution. */
export interface RunActionsOptions {
  /** Directory actions run in. */
  cwd: string;
  /** Answers and derived variables. */
  variables: TemplateVariables;
  /** Whether commands may actually run. */
  execute: boolean;
  /** Called with a human-readable label before each command runs. */
  onStep?: (label: string) => void;
}

/** Result of running a scaffold's post-create actions. */
export interface RunActionsResult {
  /** Labels of the commands that ran. */
  completed: string[];
  /** Labels of commands that failed but were not required. */
  failed: string[];
  /** Rendered messages to show the user. */
  messages: string[];
}

/**
 * Runs a scaffold's post-create actions.
 *
 * Actions whose `when` condition is false are skipped. A `run` action marked
 * `required` aborts on failure; every other failure is reported and execution
 * continues, so a missing package manager never destroys a valid project.
 *
 * @param actions - Actions declared by the scaffold.
 * @param options - Working directory, variables, and execution switches.
 * @returns What ran, what failed, and the messages to print.
 * @throws {Error} When a required command fails.
 */
export async function runActions(
  actions: readonly ScaffoldAction[],
  options: RunActionsOptions,
): Promise<RunActionsResult> {
  const result: RunActionsResult = {
    completed: [],
    failed: [],
    messages: [],
  };

  for (const action of actions) {
    if (action.when && !evaluateCondition(action.when, options.variables)) {
      continue;
    }

    if (action.type === 'message') {
      result.messages.push(renderTemplate(action.text, options.variables));
      continue;
    }

    const commands = action.type === 'git-init'
      ? gitCommands(action.commit === undefined
        ? undefined
        : renderTemplate(action.commit, options.variables))
      : [{
        command: action.command,
        args: action.args.map(
          (argument) => renderTemplate(argument, options.variables),
        ),
      }];
    const label = action.type === 'git-init'
      ? 'Initialize a git repository'
      : action.label ?? `${action.command} ${action.args.join(' ')}`.trim();

    options.onStep?.(label);

    if (!options.execute) {
      continue;
    }

    const failure = await runCommands(commands, options.cwd);

    if (!failure) {
      result.completed.push(label);
      continue;
    }

    if (action.type === 'run' && action.required) {
      throw new Error(`Action "${label}" failed: ${failure}`);
    }

    result.failed.push(label);
  }

  return result;
}

function gitCommands(
  commit: string | undefined,
): { command: string; args: string[] }[] {
  const commands = [{ command: 'git', args: ['init'] }];

  if (commit) {
    commands.push(
      { command: 'git', args: ['add', '--all'] },
      { command: 'git', args: ['commit', '--message', commit] },
    );
  }

  return commands;
}

async function runCommands(
  commands: readonly { command: string; args: string[] }[],
  cwd: string,
): Promise<string | undefined> {
  for (const { command, args } of commands) {
    try {
      const process = await x(command, args, {
        nodeOptions: { cwd },
        throwOnError: true,
      });

      if (process.exitCode !== 0) {
        return `exit code ${process.exitCode}`;
      }
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }
  }

  return undefined;
}
