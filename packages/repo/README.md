# `@your-org/repo`

Repository bootstrap, synchronization, validation, and migration tooling.

## Commands

```bash
pnpm exec repo init --profile typescript-library
pnpm exec repo sync
pnpm exec repo check
pnpm exec repo migrate
```

## Configuration

Projects contain `.repo-tooling.json`:

```json
{
  "schemaVersion": 1,
  "profiles": [
    "typescript-library"
  ],
  "variables": {
    "githubOwner": "your-org",
    "repositoryName": "example-library"
  }
}
```

## Managed-file ownership

`repo sync` stores exact hashes in `.repo-tooling.lock.json`.

The CLI only replaces a file automatically when:

1. the file does not exist; or
2. its current content still matches the hash written by the previous sync.

A file that has been modified locally is reported as a conflict. Use
`repo sync --force` only when the centrally managed version should win.

Files not present in the lock file are never removed simply because they are
not part of a profile.

## Profiles

Profiles and their managed files are declared in `templates/profiles.json`.
Profile inheritance is supported. Later profiles override earlier definitions
that target the same path.

Managed text files support simple variables:

```text
{{githubOwner}}
{{repositoryName}}
```

All referenced variables must exist in `.repo-tooling.json`.

## Adding migrations

Configuration migrations live in `src/migrations/registry.ts`.

Each migration has an explicit `from` and `to` schema version and receives raw
JSON so historical configuration shapes do not pollute the current public
types.
