---
"@paulhalleux/repo": minor
"@paulhalleux/scaffold": minor
---

Unify repository synchronization and project scaffolding on one engine.

Profiles are gone: a repository now subscribes to the same catalog layers
`repo create` composes, and a layer declares whether it is `managed`. Managed
layers stay tool-owned and are kept current by `repo sync` under the existing
lock-based ownership rules; unmanaged layers are handed over to the project on
write, exactly as before. The shared CI workflow and the AI skills and agents
are ordinary managed layers (`repo/github-ci`, `ai/skills`, `ai/agents`), so
there is one catalog, one Handlebars renderer, one composition step, and one
conflict model instead of two of each.

`.repo-tooling.json` moves to schema version 2, replacing `profiles` with
`layers` and `variables` with `answers`; `repo migrate` converts existing
configurations. Recording answers is what lets `repo sync` re-render managed
layers later without asking again, and `repo create` and `repo apply` now
subscribe a project to any managed layer they materialize.

Layers can ask their own questions, so the AI layers now let each repository
choose which skills and agents it installs (`repo init --set skills=refactor,
handoff --set agents=reviewer`); changing the selection and running `repo sync`
adds and removes resources, pruning directories left empty. A question added to
a layer after a repository subscribed falls back to its default rather than
dropping the files it gates.

Subscribing to a managed layer records hashes without writing, so applying one
layer can no longer overwrite a hand-edited file belonging to another layer the
project already subscribed to; such a file is reported as a conflict by the next
`repo sync` instead.

Recorded answers are grouped by scope - `answers.shared` and
`answers.layers["<id>"]` - so two layers can ask a question of the same name
without colliding and synchronization can find each layer's answers directly;
derived variables stay shared. A layer that contributes no files for the
recorded answers is now reported instead of silently doing nothing.

Only `.tmpl` files are rendered, so workflow YAML using `${{ }}` is copied
byte-for-byte.
