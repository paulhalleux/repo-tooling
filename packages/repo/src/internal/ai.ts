import { join, posix } from 'node:path';

import type {
  ManagedFileDefinition,
  ResolvedRepositoryAiProfile,
} from '../types.js';
import { listFilesRecursive, pathExists } from './fs.js';
import { RESOURCES_DIRECTORY } from './resources.js';

const RESOURCE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/**
 * Converts a resolved AI profile into ordinary managed-file declarations.
 *
 * Skills are copied recursively to `.agents/skills/<name>`, custom agents are
 * copied to `.codex/agents/<name>.toml`, and shared instruction fragments are
 * copied to `.repo-tooling/instructions/<name>.md`.
 *
 * AI files are never template-rendered. This prevents prompt examples using
 * brace syntax from being interpreted as repository template variables.
 *
 * @param ai - Resolved AI resource selection.
 * @returns Managed-file declarations suitable for the standard sync engine.
 * @throws {Error} When a requested resource name is unsafe or missing from the
 * distributed catalog.
 */
export async function resolveAiManagedFiles(
  ai: ResolvedRepositoryAiProfile,
): Promise<ManagedFileDefinition[]> {
  const files: ManagedFileDefinition[] = [];

  for (const skill of ai.skills) {
    assertResourceName(skill, 'skill');

    const relativeSkillRoot = join('ai', 'skills', skill);
    const absoluteSkillRoot = join(RESOURCES_DIRECTORY, relativeSkillRoot);

    if (!await pathExists(absoluteSkillRoot)) {
      throw new Error(`Unknown AI skill "${skill}".`);
    }

    const skillFiles = await listFilesRecursive(absoluteSkillRoot);

    if (skillFiles.length === 0) {
      throw new Error(`AI skill "${skill}" does not contain any files.`);
    }

    for (const relativeFile of skillFiles) {
      files.push({
        source: posix.join('ai', 'skills', skill, relativeFile.replaceAll('\\', '/')),
        target: posix.join('.agents', 'skills', skill, relativeFile.replaceAll('\\', '/')),
        render: false,
      });
    }
  }

  for (const agent of ai.agents) {
    assertResourceName(agent, 'agent');

    const source = posix.join('ai', 'agents', `${agent}.toml`);
    const absoluteSource = join(RESOURCES_DIRECTORY, source);

    if (!await pathExists(absoluteSource)) {
      throw new Error(`Unknown AI agent "${agent}".`);
    }

    files.push({
      source,
      target: posix.join('.codex', 'agents', `${agent}.toml`),
      render: false,
    });
  }

  for (const instruction of ai.instructions) {
    assertResourceName(instruction, 'instruction');

    const source = posix.join('ai', 'instructions', `${instruction}.md`);
    const absoluteSource = join(RESOURCES_DIRECTORY, source);

    if (!await pathExists(absoluteSource)) {
      throw new Error(`Unknown AI instruction fragment "${instruction}".`);
    }

    files.push({
      source,
      target: posix.join('.repo-tooling', 'instructions', `${instruction}.md`),
      render: false,
    });
  }

  return files;
}

/**
 * Validates a catalog resource name before it is interpolated into a path.
 *
 * @param name - Catalog key to validate.
 * @param kind - Human-readable resource kind used in diagnostics.
 * @throws {Error} When the name could escape or reshape the expected resource
 * directory.
 */
export function assertResourceName(
  name: string,
  kind: string,
): void {
  if (!RESOURCE_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid AI ${kind} name "${name}".`);
  }
}
