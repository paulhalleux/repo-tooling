---
"@paulhalleux/repo": minor
---

Rebuild `repo create` on `@paulhalleux/scaffold` and add `repo apply`.

`repo create` is now interactive: running it without arguments asks for the
scaffold, destination, and every question the scaffold declares, and `--set
<name>=<value>`, `--yes`, and `--dry-run` cover non-interactive use. Scaffolds
can run post-create actions such as `git init` and `pnpm install`, and can be
loaded from `.repo-tooling/scaffolds`, any directory, or a remote git source via
`--source`; actions from remote sources require `--allow-remote-actions`.

`repo apply <scaffold-or-layer>` layers a scaffold or a single layer onto an
existing project, merging `package.json` with the project's values winning and
reporting conflicts instead of overwriting local changes.

Adds a `monorepo` scaffold - pnpm workspace, recursive scripts, optional
Changesets and CI - and a `library/typescript` scaffold for TypeScript
libraries without React. Repository-wide questions (git initialization, CI
workflow, dependency installation) now belong exclusively to the `monorepo`
scaffold; package scaffolds ask only about the package itself.
Every bundled scaffold - `app/react`, `library/react`, and
`library/typescript` - is now composed from shared layers (`base/package`,
`base/typescript`, `registry/paulhalleux`, `tooling/oxlint`, `bundler/tsdown`,
`bundler/vite`, `entry/typescript-library`, `entry/react-library`,
`entry/react-app`, `workspace/pnpm`, `workspace/changesets`, `testing/vitest`,
`ci/github`, `publish/github-packages`) rather than shipping a
duplicated directory tree each, so all three now offer the same optional
testing, CI, and publishing features.
