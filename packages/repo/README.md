# `@paulhalleux/repo`

Repository bootstrap, synchronization, validation, migration, and project-scoped
AI tooling.

## Commands

```bash
pnpm exec repo init --profile typescript-library
pnpm exec repo sync
pnpm exec repo check
pnpm exec repo migrate
pnpm exec repo ai list
```

`repo sync` is intentionally the single materialization command. Repository
files and AI resources use the same ownership and conflict rules.

## Repository configuration

Projects contain `.repo-tooling.json`:

```json
{
  "schemaVersion": 1,
  "profiles": [
    "typescript-library"
  ],
  "variables": {
    "githubOwner": "paulhalleux",
    "repositoryName": "example-library"
  }
}
```

The profile itself selects both repository files and AI resources; no separate
AI preset is required.

## Profile catalog

Canonical profiles live at the `repo-tooling` repository root in
`profiles/catalog.json`:

```json
{
  "profiles": {
    "typescript-library": {
      "extends": ["base"],
      "files": [
        {
          "source": "templates/typescript-library/.github/workflows/ci.yml",
          "target": ".github/workflows/ci.yml"
        }
      ],
      "ai": {
        "skills": ["typescript-library"],
        "agents": ["architect"],
        "instructions": ["typescript"]
      }
    }
  }
}
```

Profile inheritance applies before the current profile. Managed files from a
later profile override earlier declarations with the same target. Skills,
agents, and instruction fragments compose additively and are de-duplicated.

## AI layout

Canonical AI resources live at the monorepo root:

```text
ai/
├── skills/
│   └── <skill>/
│       ├── SKILL.md
│       └── ...
├── agents/
│   └── <agent>.toml
└── instructions/
    └── <fragment>.md
```

`repo sync` materializes them as:

```text
.agents/skills/<skill>/**
.codex/agents/<agent>.toml
.repo-tooling/instructions/<fragment>.md
```

Instruction fragments are deliberately not merged into `AGENTS.md` yet. This
keeps project instructions project-owned and avoids partial-file ownership in
the initial synchronization model.

## Managed-file ownership

`repo sync` stores exact hashes in `.repo-tooling.lock.json`.

The CLI only replaces a file automatically when:

1. the file does not exist; or
2. its current content still matches the hash written by the previous sync.

A file that has been modified locally is reported as a conflict. Use
`repo sync --force` only when the centrally managed version should win.

Files not present in the lock file are never removed simply because they are
not part of a profile. This allows project-owned skills to live next to shared
skills safely.

AI resources are copied without template rendering. Repository templates render
`{{variableName}}` placeholders by default.

## Distribution

The canonical `ai/`, `profiles/`, and `templates/` directories stay at the
repository root. `packages/repo/scripts/build-resources.mjs` copies them into
`packages/repo/resources/` during `pnpm build`, and the published npm package
contains only `dist/` plus those generated `resources/`.
