# `@paulhalleux/scaffold`

Composable, prompt-driven project scaffolding engine.

The package contains only the engine. Scaffold content - catalogs, layers, and
templates - lives with whoever ships it, for example `@paulhalleux/repo`.

## Model

A **catalog** declares layers and scaffolds:

- a **layer** is a directory of files plus its own prompts, derived variables,
  file rules, and post-create actions;
- a **scaffold** composes layers in order and adds project-level prompts.

A layer also declares how long it stays yours:

- **unmanaged** (the default) - written once, then owned by the project;
- **managed** - stays tool-owned, recorded in a lock file, and kept current by
  `syncPlan`.

A layer may set `target` to write below a subdirectory of the project, which is
how a layer of agent skills lands in `.agents/skills` without mirroring that
path on disk.

Files ending in `.tmpl` are rendered as Handlebars templates and lose the
suffix; every other file is copied byte-for-byte. When two layers target the
same path, JSON targets are deep-merged and anything else is replaced by the
later layer. That is what lets a `testing/vitest` layer add scripts and
dev dependencies to the `package.json` written by a `base/package` layer.

## Catalog

```json
{
  "layers": {
    "base/package": {
      "source": "layers/base-package",
      "description": "package.json, README, and .gitignore."
    },
    "testing/vitest": {
      "source": "layers/testing-vitest",
      "description": "Vitest setup and an example test.",
      "prompts": [
        {
          "type": "confirm",
          "name": "coverage",
          "message": "Add coverage reporting?",
          "default": false
        }
      ]
    },
    "ai/skills": {
      "source": "ai/skills",
      "target": ".agents/skills",
      "managed": true,
      "prompts": [
        {
          "type": "multiselect",
          "name": "skills",
          "message": "Agent skills",
          "default": ["refactor", "handoff"],
          "choices": [{ "value": "refactor" }, { "value": "handoff" }]
        }
      ],
      "files": [
        { "path": "refactor/**", "when": "(includes skills \"refactor\")" },
        { "path": "handoff/**", "when": "(includes skills \"handoff\")" }
      ]
    }
  },
  "scaffolds": {
    "library/typescript": {
      "description": "TypeScript library.",
      "prompts": [
        {
          "type": "text",
          "name": "packageName",
          "message": "Package name",
          "default": "{{projectName}}",
          "validate": { "rule": "npm-package-name" }
        },
        {
          "type": "multiselect",
          "name": "features",
          "message": "Features",
          "default": ["tests"],
          "choices": [{ "value": "tests" }, { "value": "ci" }]
        }
      ],
      "variables": {
        "exportName": "{{camel packageName}}"
      },
      "layers": [
        { "id": "base/package" },
        { "id": "testing/vitest", "when": "(includes features \"tests\")" }
      ],
      "files": [{ "path": "src/**/*.test.ts", "when": "(includes features \"tests\")" }],
      "actions": [
        { "type": "git-init", "when": "git", "commit": "chore: scaffold {{packageName}}" },
        { "type": "run", "when": "install", "command": "pnpm", "args": ["install"] },
        { "type": "message", "when": "(not install)", "text": "pnpm install" }
      ]
    }
  }
}
```

Every scaffold is layer-based; there is no single-directory shorthand. A
one-off scaffold is simply a scaffold with one layer.

### Questions

`text`, `confirm`, `select`, and `multiselect`. Every question supports `when`
to gate it on earlier answers; text questions also support `validate` with a
`pattern` and/or a built-in `rule` (`npm-package-name`, `relative-path`,
`semver`). Defaults are themselves templates, so `"{{projectName}}"` works.

Skipped questions resolve to a neutral value - `false`, `[]`, or the default -
so a gated feature stays off rather than silently turning on.

### Conditions

`when` and `files[].when` are Handlebars `{{#if}}` expressions evaluated against
the answers: `tests`, `(eq license "MIT")`, `(includes features "ci")`,
`(not install)`.

### Templates

Handlebars in strict mode, so a typo in a variable name fails the run instead of
producing a half-written file. Helpers: `eq`, `ne`, `not`, `includes`, `json`,
and the `kebab`, `camel`, `pascal`, `snake`, `title` case converters.

### File rules

`files[].path` is a glob (`picomatch`) matched against the target path. Matching
files are written only when the rule's condition holds.

### Actions

`git-init` (with an optional `commit` message), `run` (a command with `args`;
`required: true` makes a failure fatal), and `message` (rendered and printed).

## Sources

A source is a directory containing `catalog.json`. `resolveScaffoldSource`
accepts a filesystem path or any `giget` specification, such as
`github:owner/repo/scaffolds#main`. Remote sources are downloaded into a cache
directory and marked untrusted; their actions execute commands, so the caller
decides whether untrusted actions may run.

`resolveCatalog` merges sources in order, so a later source can shadow an
earlier scaffold or layer by reusing its ID.

## API

```ts
import {
  prepareProject,
  requireScaffold,
  resolveCatalog,
  runActions,
  writePlan,
} from "@paulhalleux/scaffold";

const catalog = await resolveCatalog([
  { root: "/path/to/scaffolds", origin: "bundled", trusted: true },
]);

const entry = requireScaffold(catalog, "library/typescript");

const project = await prepareProject(entry, catalog, {
  baseVariables: { projectName: "my-lib" },
  presetAnswers: { features: "tests,ci" },
  interactive: true,
});

await writePlan(project.files, { destination, mode: "create" });

await runActions(project.actions, {
  cwd: destination,
  variables: project.variables,
  execute: true,
});
```

`prepareProject` asks the scaffold's questions, resolves which layers apply,
asks each included layer's own questions, and composes the file plan.

It returns `answers` grouped by scope - `{ shared, layers }` - alongside the
flattened `variables`. Each layer renders with `shared` plus its own answers, so
two layers can ask a question of the same name without colliding, and a caller
that stores the answers can find exactly the ones a layer needs later. Derived
`variables` declared by a layer stay shared, since their whole point is to be
readable from another layer's templates.

## Writing

`writePlan` has two modes:

- `create` stages the whole project in a temporary directory and moves it into
  place, so a failure never leaves a half-written project. The destination must
  be missing or empty.
- `apply` layers files onto an existing project: missing files are created, JSON
  files are merged with the project's existing values winning, identical files
  are left alone, and anything else that differs is reported as a conflict
  unless `force` is set.

Both modes accept `dryRun` to report the outcome without touching the disk.

## Synchronizing

`syncPlan` is the third mode, for files that stay tool-owned:

```ts
import {
  planLayers,
  requireLayers,
  resolveScopedAnswers,
  syncPlan,
} from "@paulhalleux/scaffold";

const layers = requireLayers(catalog, ["ai/skills", "ai/agents"]);
const answers = await resolveScopedAnswers(layers, recorded.shared, {
  knownAnswers: recorded.layers,
});
const files = await planLayers(layers, answers);

const { result, managed } = await syncPlan(files.filter((f) => f.managed), {
  destination,
  previous: lock.files,
  check: false,
});
```

A file is replaced only when it is absent or still matches the hash recorded by
the previous run; a hand-edited file is reported as a conflict instead. Files
that are no longer declared are removed when untouched, and directories left
empty are pruned. `check: true` reports what would happen and writes nothing.

Persist the returned `managed` map as the lock for the next run, and record the
answers alongside it so the same layers re-render identically later.
