# `@paulhalleux/repo`

Repository bootstrap, synchronization, validation, migration, and project-scoped
AI tooling.

## Commands

| Command | Purpose |
| --- | --- |
| `repo create [scaffold] [dir]` | Create a project from a scaffold |
| `repo apply <target> [dir]` | Add a scaffold or layer to an existing project |
| `repo init [scaffold]` | Subscribe a repository to managed tooling layers |
| `repo sync` | Bring subscribed managed layers up to date |
| `repo check` | Report drift and conflicts without writing (CI-friendly) |
| `repo ai list` | Show the skills and agents the repository subscribes to |
| `repo migrate` | Upgrade `.repo-tooling.json` to the current schema |

```bash
pnpm exec repo create                     # guided: pick a scaffold, answer questions
pnpm exec repo create monorepo my-repo
pnpm exec repo create library/typescript my-lib
pnpm exec repo create library/react/my-library   # compact "<scaffold>/<dir>" form
pnpm exec repo apply testing/vitest       # add a layer to an existing project
pnpm exec repo init                       # subscribe to managed tooling
pnpm exec repo sync
pnpm exec repo check
```

## One engine, two lifetimes

Everything the CLI writes comes from the same catalog, renderer, and
composition step. Layers differ only in what happens *after* they are written:

| | Unmanaged layer | Managed layer |
| --- | --- | --- |
| Written by | `repo create`, `repo apply` | `repo create`, `repo apply`, `repo init` |
| After writing | Owned by the project; never touched again | Stays tool-owned |
| Kept current by | Nothing - edit freely | `repo sync` |
| Tracked in | - | `.repo-tooling.lock.json` |
| Examples | `testing/vitest`, `entry/react-app` | `repo/github-ci`, `ai/skills`, `ai/agents` |

Materializing a managed layer subscribes the project to it: the layer ID and
the answers it rendered with are recorded in `.repo-tooling.json`, so later
synchronizations reproduce it without asking again.

## Creating projects

`repo create` runs the scaffolding engine in
[`@paulhalleux/scaffold`](../scaffold/README.md) over the catalog in
`resources/catalog.json`. Run it with no arguments for a guided run, or pass
answers up front:

```bash
repo create library/typescript my-lib \
  --set packageName=@acme/my-lib \
  --set features=tests,publish \
  --yes
```

| Flag | Effect |
| --- | --- |
| `--list` | List available scaffolds and layers |
| `--set <name>=<value>` | Pre-answer a question; repeatable |
| `--package-name <name>` | Shorthand for `--set packageName=<name>` |
| `--yes` | Accept every default instead of asking |
| `--source <spec>` | Extra scaffold source: a directory or a `giget` specification |
| `--dry-run` | Report what would be created |
| `--no-actions` | Skip post-create actions |
| `--allow-remote-actions` | Run actions declared by remote sources |

Creation targets a new or empty directory. Post-create actions - `git init`, an
optional `pnpm install` - are declared by the scaffold and can always be
skipped. Actions coming from a remote source never run without
`--allow-remote-actions`.

## Applying layers to an existing project

```bash
repo apply testing/vitest            # add Vitest to the current project
repo apply repo/base ./packages/api  # add managed tooling to one package
repo apply testing/vitest --dry-run
```

Run without a directory argument, `apply` targets the current directory and
asks for confirmation first, because it edits files in place. A directory that
does not exist yet is created.

Missing files are created, `package.json` is merged with the project's existing
values winning, identical files are left alone, and anything else that differs
is reported as a conflict rather than overwritten. Use `--force` when the
layer's version should win.

## Scaffold catalog

Scaffolds and layers live in `resources/catalog.json`. A layer is a directory of
files with its own prompts, variables, file rules, and actions; a scaffold
composes layers:

```json
{
  "layers": {
    "testing/vitest": {
      "source": "layers/testing-vitest",
      "description": "Vitest setup and an example test."
    }
  },
  "scaffolds": {
    "library/typescript": {
      "description": "TypeScript library.",
      "prompts": [
        { "type": "multiselect", "name": "features", "message": "Features",
          "choices": [{ "value": "tests" }, { "value": "ci" }] }
      ],
      "layers": [
        { "id": "base/package" },
        { "id": "testing/vitest", "when": "(includes features \"tests\")" }
      ]
    }
  }
}
```

Files ending in `.tmpl` are rendered as Handlebars templates, and JSON files
contributed by several layers are deep-merged - which is how `package.json` and
`tsconfig.json` end up assembled from the layers a project selected. The full
schema is documented in [`@paulhalleux/scaffold`](../scaffold/README.md).

The bundled layers are:

| Layer | Contributes |
| --- | --- |
| `base/package` | `package.json`, `README.md`, `.gitignore` |
| `base/typescript` | `tsconfig.json` and the `typecheck` script |
| `registry/paulhalleux` | `.npmrc` routing `@paulhalleux` to GitHub Packages |
| `tooling/oxlint` | oxlint and oxfmt configuration and scripts |
| `bundler/tsdown` | tsdown config, package entry points, `rootDir` |
| `bundler/vite` | Vite config, `index.html`, dev/build/preview scripts |
| `entry/typescript-library` | TypeScript library entry point and example test |
| `entry/react-library` | React library entry point and peer dependencies |
| `entry/react-app` | React application shell |
| `workspace/pnpm` | `pnpm-workspace.yaml` and recursive root scripts |
| `workspace/changesets` | Changesets configuration and release scripts |
| `testing/vitest` | Vitest config and test script (asks about coverage) |
| `publish/github-packages` | `publishConfig` for GitHub Packages |
| `repo/github-ci` | **Managed** - shared CI workflow |
| `ai/skills` | **Managed** - agent skills, selectable per project |
| `ai/agents` | **Managed** - custom agents, selectable per project |

Every scaffold composes these layers; none of them ships a duplicated directory
tree.

Repository-wide concerns belong to the `monorepo` scaffold: it is the only one
that asks about `git init`, a CI workflow, releases, and installing
dependencies. Package scaffolds ask only about the package itself - name,
description, license, tests, and publishing - because they are normally created
inside a repository that already answered those questions:

```bash
repo create monorepo acme
cd acme
repo create library/typescript packages/core
repo create app/react apps/web
```

A repository can add its own scaffolds in `.repo-tooling/scaffolds/`, which is
picked up automatically, or point at any directory or git repository with
`--source`. Later sources shadow earlier ones with the same ID.

The bundled scaffolds configure the `@paulhalleux` scope for GitHub Packages
without writing credentials. Authenticate GitHub Packages in your user-level npm
configuration before installing if you have not already done so.

## Repository tooling

`repo init` subscribes a repository to managed layers and materializes them:

```bash
repo init                                  # defaults to the repo/base scaffold
repo init --layer ai/skills ai/agents      # subscribe to specific layers
repo init --set skills=refactor,handoff --set agents=reviewer --yes
```

| Flag | Effect |
| --- | --- |
| `--layer <id...>` | Subscribe to these layers instead of a scaffold's list |
| `--set <name>=<value>` | Pre-answer a scaffold or layer question; repeatable |
| `--github-owner`, `--repository-name` | Override values inferred from `origin` |
| `--yes` | Accept every default instead of asking |
| `--force` | Replace existing configuration and conflicting files |
| `--no-sync` | Write configuration without materializing files |

GitHub owner and repository name are inferred from the `origin` remote, falling
back to the root `package.json` name.

`repo sync` then keeps those layers current, and `repo check` is the same pass
in report-only mode - use it in CI:

```bash
repo sync            # apply pending updates
repo sync --check    # report drift; non-zero exit when out of date
repo sync --force    # let the managed version win over local edits
```

## Selecting AI resources

Skills and agents are managed layers that ask their own questions, so a project
installs only what it wants:

```bash
repo init --set skills=refactor,debug-failure,task-spec --set agents=reviewer
repo ai list
```

Skills are materialized to `.agents/skills/<skill>/**` and agents to
`.codex/agents/<agent>.toml`. Changing the recorded selection and running
`repo sync` adds the newly selected resources and removes the deselected ones,
pruning directories left empty. AI files are never template-rendered, so prompt
text using brace syntax is copied verbatim.

## Repository configuration

`.repo-tooling.json` records what a repository subscribes to and the answers its
layers render with:

```json
{
  "schemaVersion": 2,
  "layers": [
    "repo/github-ci",
    "ai/skills",
    "ai/agents"
  ],
  "answers": {
    "shared": {
      "githubOwner": "paulhalleux",
      "repositoryName": "example-library"
    },
    "layers": {
      "ai/skills": { "skills": ["refactor", "handoff"] },
      "ai/agents": { "agents": ["reviewer"] }
    }
  }
}
```

Answers are grouped by scope. `shared` holds what every layer can see; each
layer's own questions are stored under its ID, so two layers can ask a question
of the same name without one overwriting the other, and `repo sync` knows
exactly which answers belong to which layer. Derived variables stay shared on
purpose - a layer that computes `tsconfigPreset` does so precisely so another
layer's template can read it.

An answer a layer never recorded falls back to that question's default, so a
question added upstream after you subscribed never silently drops the files it
gates. An empty selection, on the other hand, is honoured: `repo sync` reports
`empty  <layer> contributes no files for the recorded answers` so a layer that
writes nothing is never a silent no-op.

Earlier schema versions used named profiles; `repo migrate` converts them to the
equivalent layers.

## Managed-file ownership

`repo sync` stores exact hashes in `.repo-tooling.lock.json`.

The CLI only replaces a file automatically when:

1. the file does not exist; or
2. its current content still matches the hash written by the previous sync.

A file that has been modified locally is reported as a conflict. Use
`repo sync --force` only when the centrally managed version should win.

Files not present in the lock file are never removed simply because they are not
declared by a subscribed layer. This allows project-owned skills to live next to
shared skills safely.

## Distribution

`resources/` is canonical package content and is published directly beside
`dist/`. The build validates required resource entry points but does not copy or
rewrite them, so development, tests, and published consumers read the same
files.
