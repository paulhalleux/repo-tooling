# `@paulhalleux/repo-tooling`

Personal, reusable development tooling for Node.js and TypeScript repositories.

This repository centralizes:

* shared TypeScript and tooling configurations;
* reusable GitHub Actions workflows;
* repository bootstrap and synchronization through `@paulhalleux/repo`;
* composable project scaffolding through `@paulhalleux/scaffold`;
* one catalog of layers shared by both;
* project-scoped Codex agents and skills;
* package versioning and publication through Changesets and GitHub Packages.

The goal is to keep individual repositories small and project-focused while sharing conventions, CI behavior, and AI development tooling without relying on machine-global configuration.

## Repository structure

```text
repo-tooling/
├── .changeset/             # Changesets release metadata
├── .github/
│   └── workflows/
│       ├── ci.yml          # CI for this repository
│       ├── node-ci.yml     # Reusable Node/pnpm CI
│       └── release.yml     # Package versioning and publishing
│
├── configs/
│   ├── oxfmt/
│   ├── oxlint/
│   ├── tsconfig/
│   ├── tsdown/
│   ├── typedoc/
│   ├── vite/
│   └── vitest/
│
├── packages/
│   ├── repo/               # @paulhalleux/repo CLI
│   │   ├── resources/      # Canonical distributable resources
│   │   │   ├── ai/         # Skills and agents (also layer sources)
│   │   │   ├── layers/     # Composable layers
│   │   │   └── catalog.json
│   │   └── src/
│   └── scaffold/           # @paulhalleux/scaffold engine
│       └── src/
├── package.json
├── pnpm-lock.yaml
└── pnpm-workspace.yaml
```

## Packages

Packages are published under the `@paulhalleux` scope through GitHub Packages.

| Package                       | Purpose                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------- |
| `@paulhalleux/oxfmt-config`   | Shared Oxfmt configuration                                                       |
| `@paulhalleux/oxlint-config`  | Shared Oxlint configuration                                                      |
| `@paulhalleux/tsconfig`       | Shared TypeScript configurations                                                 |
| `@paulhalleux/tsdown-config`  | Shared tsdown build configuration                                                |
| `@paulhalleux/typedoc-config` | Shared TypeDoc configuration                                                     |
| `@paulhalleux/vite-config`    | Shared Vite configuration for React applications                                |
| `@paulhalleux/vitest-config`  | Shared Vitest configuration                                                      |
| `@paulhalleux/repo`           | Repository bootstrap, synchronization, validation, migration, and AI tooling CLI |
| `@paulhalleux/scaffold`       | Composable, prompt-driven project scaffolding engine                             |

Packages are independently versioned.

## GitHub Packages

The `@paulhalleux` npm scope is hosted on GitHub Packages.

Projects consuming these packages should contain:

```ini
# .npmrc
@paulhalleux:registry=https://npm.pkg.github.com
```

### Local authentication

GitHub Packages requires authentication.

Keep credentials outside repositories, for example in `~/.npmrc`:

```ini
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

Then expose a GitHub Personal Access Token with `read:packages`:

```bash
export GITHUB_PACKAGES_TOKEN="ghp_..."
```

Packages can then be installed normally:

```bash
pnpm add -D \
  @paulhalleux/tsconfig \
  @paulhalleux/tsdown-config \
  @paulhalleux/vitest-config
```

Do not commit package tokens to a repository.

## Repository CLI

`@paulhalleux/repo` manages repository-level tooling and project-scoped AI resources.

Install it as a development dependency:

```bash
pnpm add -D @paulhalleux/repo
```

Available commands include:

```bash
pnpm exec repo create                       # guided: pick a scaffold, answer questions
pnpm exec repo create monorepo my-repo
pnpm exec repo create library/typescript my-lib
pnpm exec repo create app/react my-app
pnpm exec repo apply testing/vitest         # add a layer to an existing project
pnpm exec repo init                         # subscribe to managed tooling layers
pnpm exec repo sync
pnpm exec repo check
pnpm exec repo migrate
pnpm exec repo ai list
```

### Initialize a repository

```bash
pnpm exec repo init
```

This creates a `.repo-tooling.json` recording the managed layers the repository
subscribes to and the answers they render with:

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

## Layers

Repository tooling and project scaffolding share one catalog, one template
renderer, and one composition step:

```text
packages/repo/resources/catalog.json
```

A layer is a directory of files with its own questions, file rules, and
actions. Scaffolds compose layers; repositories subscribe to them. A layer
declares whether it is *managed*:

* **unmanaged** layers - `testing/vitest`, `entry/react-app` - are written once
  and handed over to the project;
* **managed** layers - `repo/github-ci`, `ai/skills`, `ai/agents` - stay
  tool-owned and are kept current by `repo sync`.

Layers that offer a choice ask for it themselves. The AI layers, for instance,
let each repository pick which skills and agents it installs:

```bash
pnpm exec repo init --set skills=refactor,debug-failure --set agents=reviewer
pnpm exec repo ai list
```

Earlier versions used named profiles; `repo migrate` converts an existing
`.repo-tooling.json` to the equivalent layers.

## Synchronization

The main synchronization command is:

```bash
pnpm exec repo sync
```

It re-renders every managed layer the repository subscribes to, using the
answers recorded at initialization:

```text
repo-tooling                          consumer repository
────────────                          ───────────────────

layers/repo-github-ci/...   ──────►  .github/workflows/...

ai/skills/<selected>/...    ──────►  .agents/skills/...

ai/agents/<selected>.toml   ──────►  .codex/agents/...
```

Only files ending in `.tmpl` are rendered, as Handlebars templates with the
recorded answers - `{{githubOwner}}`, `{{repositoryName}}`, and any answer a
layer asked for. Everything else, including AI resources and workflow YAML using
`${{ }}`, is copied byte-for-byte.

Deselecting a skill or agent and running `repo sync` removes it again, provided
the file is still untouched.

## Managed-file ownership

Synchronization is intentionally conservative.

`repo sync` records managed files and their hashes in:

```text
.repo-tooling.lock.json
```

A managed file is automatically updated only when:

1. it does not exist; or
2. its current content still matches the content previously written by `repo sync`.

If a developer modifies a managed file manually and the shared version later changes, synchronization reports a conflict instead of overwriting the local change.

To explicitly make the shared version win:

```bash
pnpm exec repo sync --force
```

Unknown files are never removed.

This allows repository-specific skills, agents, configuration, and source files to live alongside centrally managed resources safely.

## Checking synchronization

CI can verify that a repository is synchronized without modifying it:

```bash
pnpm exec repo check
```

or:

```bash
pnpm exec repo sync --check
```

The command exits with a failure when managed resources are stale or conflicting.

This makes tooling updates reviewable rather than silently changing repositories.

## AI tooling

Shared AI resources live under `packages/repo/resources`:

```text
ai/
├── agents/
│   ├── architect.toml
│   ├── explorer.toml
│   ├── reviewer.toml
│   ├── tester.toml
│   └── worker.toml
│
└── skills/
    ├── adapter-boundaries/
    ├── architecture-design/
    ├── architecture-review/
    ├── debug-failure/
    ├── extensibility-design/
    ├── frontend-library-development/
    ├── frontend-library-review/
    ├── handoff/
    ├── idea-to-spec/
    ├── implement-feature/
    ├── jsdoc-contracts/
    ├── library-testing/
    ├── package-distribution/
    ├── public-api-design/
    ├── public-api-review/
    ├── react-adapter/
    ├── refactor/
    ├── review-diff/
    ├── simplicity-review/
    ├── task-spec/
    └── typescript-api-design/
```

The `ai/skills` and `ai/agents` layers ask each repository which of these it
wants; the selection is recorded in `.repo-tooling.json` and re-applied by
`repo sync`.

After synchronization they become project-scoped Codex configuration:

```text
.agents/
└── skills/
    └── ...

.codex/
└── agents/
    └── ...
```

Nothing needs to be installed into a user's global Codex configuration.

Project-specific skills can be added directly beside shared skills. Because `repo sync` only owns resources recorded in its lock file, project-owned AI resources remain untouched.

To inspect the AI resources the repository subscribes to:

```bash
pnpm exec repo ai list
```

## Reusable CI

The repository exposes a reusable Node/pnpm workflow:

```text
.github/workflows/node-ci.yml
```

A consumer can use it with:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:

permissions:
  contents: read
  packages: read

jobs:
  ci:
    uses: paulhalleux/repo-tooling/.github/workflows/node-ci.yml@main
```

The workflow:

1. checks out the consumer repository;
2. configures pnpm;
3. configures Node.js and GitHub Packages authentication;
4. installs dependencies with a frozen lockfile;
5. builds the repository;
6. runs its tests.

Consumer repositories are expected to expose the corresponding package scripts.

The generated workflow requests:

```yaml
permissions:
  contents: read
  packages: read
```

so packages under `@paulhalleux` can be installed using the repository's `GITHUB_TOKEN`.

For packages with restricted access, the consumer repository must also be granted **Actions read access** in the package settings.

### Workflow versioning

During development, consumers may reference:

```yaml
uses: paulhalleux/repo-tooling/.github/workflows/node-ci.yml@main
```

Stable consumers should eventually reference a release or major alias instead:

```yaml
uses: paulhalleux/repo-tooling/.github/workflows/node-ci.yml@v1
```

The referenced branch, tag, or commit must exist in `repo-tooling`.

## Development

Requirements:

* Node.js 22 or newer for `@paulhalleux/repo`;
* pnpm.

Install the workspace:

```bash
pnpm install
```

Build all packages:

```bash
pnpm build
```

Run validation:

```bash
pnpm check
```

Run tests:

```bash
pnpm test
```

Individual workspaces can be targeted with pnpm filters:

```bash
pnpm --filter @paulhalleux/repo build
pnpm --filter @paulhalleux/tsdown-config build
```

## Releases

Packages are independently versioned using Changesets.

When making a publishable change:

```bash
pnpm changeset
```

Select the affected packages and the appropriate semantic version bump:

* `patch` for compatible fixes;
* `minor` for compatible new behavior;
* `major` for breaking changes.

Commit the generated `.changeset/*.md` file with the change.

After the change reaches `main`, the release workflow:

1. runs `changeset version`;
2. updates package versions and changelogs;
3. updates the pnpm lockfile;
4. validates the workspace;
5. commits the version changes directly to `main`;
6. publishes changed packages to GitHub Packages;
7. pushes generated package tags.

There is no separate Changesets release PR.

## Design principles

This repository follows a few intentional boundaries:

**Share behavior instead of copying it.**
Configuration packages and reusable workflows should be preferred over duplicating substantial configuration across repositories.

**Templates bootstrap; they do not remain upstream repositories.**
A repository created from a template becomes independently owned afterward.

**Profiles describe the shared development environment.**
Repository files, CI, agents, and skills are composed through the same layer
mechanism as project scaffolding; a layer's `managed` flag is the only thing
that decides whether it stays tool-owned.

**Project code remains project-owned.**
Synchronization is limited to explicitly managed resources.

**AI tooling is project-scoped.**
Shared agents and skills should be reproducible from the repository without requiring global machine configuration.

**Structural changes should be explicit.**
Repository migrations belong in `@paulhalleux/repo`, rather than being hidden inside synchronization.

## License

This repository is primarily intended for personal/shared project infrastructure. Add an explicit license here if redistribution outside the owning projects is intended.
